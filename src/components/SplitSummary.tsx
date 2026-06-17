import React, { useState } from "react";
import { Member, Item, BillDetails } from "../types";
import { DollarSign, Copy, Check, ArrowLeft, RefreshCw, Smartphone, TrendingUp, Sparkles, Receipt, FileDown, Loader2 } from "lucide-react";
import { formatAmount } from "../utils";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface SplitSummaryProps {
  members: Member[];
  items: Item[];
  billDetails: BillDetails;
  onUpdateBillDetails: (details: BillDetails) => void;
  onRestart: () => void;
  onBackToAssign: () => void;
}

export default function SplitSummary({
  members,
  items,
  billDetails,
  onUpdateBillDetails,
  onRestart,
  onBackToAssign,
}: SplitSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Let's get the target decimals for rounding based on the currency
  const decimals = (billDetails.currency === "HUF" || billDetails.currency === "JPY") ? 0 : 2;
  const factor = Math.pow(10, decimals);
  const roundValue = (val: number) => Math.round(val * factor) / factor;

  // 1. Calculate items subtotal
  const itemsSubtotal = roundValue(items.reduce((sum, item) => sum + item.price * item.quantity, 0));

  // 2. Resolve Tip value (percentage vs flat dollar)
  const resolvedTipValue = roundValue(
    billDetails.tipType === "percentage"
      ? (itemsSubtotal * billDetails.tipPercentage) / 100
      : billDetails.tip
  );

  // 3. Compute grand fees total
  const additionalFees = roundValue(billDetails.tax + billDetails.serviceCharge + resolvedTipValue);
  const grandTotal = roundValue(itemsSubtotal + additionalFees);

  // 4. Calculate what each person owes on base items
  const memberBaseAmounts: Record<string, number> = {};
  members.forEach((m) => {
    memberBaseAmounts[m.id] = 0;
  });

  // To prevent floating-point rounding issues, distribute each item's cost strictly.
  // We allocate rounded shares so they sum up to EXACTLY the item's total cost.
  let unassignedTotal = 0;
  
  interface ItemizedShare {
    itemId: string;
    name: string;
    amount: number;
    quantity: number;
    splitCount: number;
  }

  const memberItemizedShares: Record<string, ItemizedShare[]> = {};
  members.forEach((m) => {
    memberItemizedShares[m.id] = [];
  });

  items.forEach((item) => {
    const totalItemCost = roundValue(item.price * item.quantity);
    if (item.assignedTo.length > 0) {
      const pCount = item.assignedTo.length;
      const baseShare = roundValue(totalItemCost / pCount);
      let allocatedSoFar = 0;

      item.assignedTo.forEach((mId, index) => {
        let actualShare = baseShare;
        // Last person absorbs any rounding discrepancy
        if (index === pCount - 1) {
          actualShare = roundValue(totalItemCost - allocatedSoFar);
        } else {
          allocatedSoFar = roundValue(allocatedSoFar + baseShare);
        }

        if (memberBaseAmounts[mId] !== undefined) {
          memberBaseAmounts[mId] = roundValue(memberBaseAmounts[mId] + actualShare);
          memberItemizedShares[mId].push({
            itemId: item.id,
            name: item.name,
            amount: actualShare,
            quantity: item.quantity,
            splitCount: pCount
          });
        }
      });
    } else {
      unassignedTotal = roundValue(unassignedTotal + totalItemCost);
    }
  });

  // Distribute unassigned items equally to all members (if any are left), penny-matching!
  const unassignedShares: Record<string, number> = {};
  members.forEach((m) => {
    unassignedShares[m.id] = 0;
  });

  if (unassignedTotal > 0 && members.length > 0) {
    const mCount = members.length;
    const baseUnassignedShare = roundValue(unassignedTotal / mCount);
    let distributedUnassigned = 0;

    members.forEach((m, index) => {
      let actualShare = baseUnassignedShare;
      if (index === mCount - 1) {
        actualShare = roundValue(unassignedTotal - distributedUnassigned);
      } else {
        distributedUnassigned = roundValue(distributedUnassigned + baseUnassignedShare);
      }
      unassignedShares[m.id] = actualShare;
      memberBaseAmounts[m.id] = roundValue(memberBaseAmounts[m.id] + actualShare);
    });
  }

  // 5. Calculate final splits including proportional or equal Tax/Tip/Fees with strict rounding match
  // We want the sum of all individual feeShare to EXACTLY equal additionalFees.
  const rawFeeShares: Record<string, number> = {};
  let distributedFees = 0;
  const mCount = members.length;

  members.forEach((member, index) => {
    const baseAmount = memberBaseAmounts[member.id] || 0;
    
    let feeShare = 0;
    if (index === mCount - 1) {
      // Last member gets the remaining balance to guarantee exact sum matches additionalFees
      feeShare = roundValue(additionalFees - distributedFees);
    } else {
      if (billDetails.splitTaxTipMode === "proportional") {
        feeShare = itemsSubtotal > 0 ? roundValue((baseAmount / itemsSubtotal) * additionalFees) : 0;
      } else {
        feeShare = mCount > 0 ? roundValue(additionalFees / mCount) : 0;
      }
      distributedFees = roundValue(distributedFees + feeShare);
    }
    rawFeeShares[member.id] = feeShare;
  });

  const memberTotalSplits = members.map((member) => {
    const baseAmount = memberBaseAmounts[member.id] || 0;
    const feeShare = rawFeeShares[member.id] || 0;
    const unassignedShare = unassignedShares[member.id] || 0;
    const itemizedShares = memberItemizedShares[member.id] || [];

    const totalAllocated = roundValue(baseAmount + feeShare);
    const percentageOfTotal = grandTotal > 0 ? (totalAllocated / grandTotal) * 100 : 0;

    return {
      member,
      baseAmount,
      unassignedShare,
      feeShare,
      totalAllocated,
      percentageOfTotal,
      itemizedShares,
    };
  });

  // Copy formatting for group messenger sharing
  const handleCopySummary = () => {
    let text = `*BILL SPLIT BREAKDOWN*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Subtotal: ${formatAmount(itemsSubtotal, billDetails.currency)}\n`;
    if (billDetails.tax > 0) text += `Tax: ${formatAmount(billDetails.tax, billDetails.currency)}\n`;
    if (resolvedTipValue > 0) {
      const tipLabel = billDetails.tipType === "percentage" ? `Tip (${billDetails.tipPercentage}%):` : `Tip:`;
      text += `${tipLabel} ${formatAmount(resolvedTipValue, billDetails.currency)}\n`;
    }
    if (billDetails.serviceCharge > 0) text += `Service Charge: ${formatAmount(billDetails.serviceCharge, billDetails.currency)}\n`;
    text += `*Grand Total: ${formatAmount(grandTotal, billDetails.currency)}*\n\n`;

    text += `*INDIVIDUAL OUTCOMES*\n`;
    memberTotalSplits.forEach((split) => {
      // Add back the member's name next to the avatar emoji
      text += `• ${split.member.avatarEmoji} ${split.member.name} owes *${formatAmount(split.totalAllocated, billDetails.currency)}*\n`;
      
      // Add individual item costs
      if (split.itemizedShares.length > 0) {
        split.itemizedShares.forEach((itm) => {
          const qtyText = itm.quantity > 1 ? `${itm.quantity}x ` : '';
          const sharingSuffix = itm.splitCount > 1 ? ` (${itm.splitCount}-way split)` : '';
          text += `  - ${qtyText}${itm.name}${sharingSuffix}: ${formatAmount(itm.amount, billDetails.currency)}\n`;
        });
      }
      if (split.unassignedShare > 0) {
        text += `  - Shared Unassigned Items: ${formatAmount(split.unassignedShare, billDetails.currency)}\n`;
      }
      text += `  - Taxes & Fees Share: ${formatAmount(split.feeShare, billDetails.currency)}\n`;
      
      if (split.member.paymentHandle) {
        text += `  Pay to: @${split.member.paymentHandle}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Powered by AI Studio Bill Splitter & Gemini`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      let y = 50;
      const margin = 40;
      const pageWidth = 595;
      const contentWidth = pageWidth - margin * 2; // 515

      const drawPageHeader = () => {
        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("SPLIT INVOICE — POWERED BY DINER NOIR BILL SPLITTER", margin, 35);
        pdf.setDrawColor(240, 240, 240);
        pdf.setLineWidth(1);
        pdf.line(margin, 40, margin + contentWidth, 40);
      };

      const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > 800) {
          pdf.addPage();
          y = 50;
          drawPageHeader();
        }
      };

      // Initial header
      drawPageHeader();
      y = 65;

      // Title Banner
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(24, 24, 27); // zinc-900 / black
      const titleText = (billDetails.title || "SPLIT INVOICE").toUpperCase();
      pdf.text(titleText, margin, y);
      y += 22;

      // Meta subheaders
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122); // zinc-500
      const dateStr = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      pdf.text(`Date & Time: ${dateStr}`, margin, y);
      
      const currencyStr = billDetails.currency;
      pdf.text(`Currency: ${currencyStr} | Mode: ${billDetails.splitTaxTipMode === "proportional" ? "Proportional Split" : "Equal Split"}`, margin + 250, y);
      y += 15;

      // Divider line
      pdf.setDrawColor(39, 39, 42); // zinc-800
      pdf.setLineWidth(1.5);
      pdf.line(margin, y, margin + contentWidth, y);
      y += 20;

      // Draw Bill Details Overview Box
      checkPageBreak(120);
      pdf.setFillColor(248, 250, 252); // soft cool grey/blue background
      pdf.rect(margin, y, contentWidth, 80, "F");
      
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text("RECEIPT FEES & TOTALS", margin + 15, y + 20);

      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(51, 65, 85); // slate-700
      pdf.text(`Items Subtotal: ${formatAmount(itemsSubtotal, currencyStr)}`, margin + 15, y + 40);
      pdf.text(`Taxes Amount: ${formatAmount(billDetails.tax, currencyStr)}`, margin + 15, y + 55);

      pdf.text(`Tips Amount: ${formatAmount(resolvedTipValue, currencyStr)}`, margin + 190, y + 40);
      pdf.text(`Extra Service Fees: ${formatAmount(billDetails.serviceCharge, currencyStr)}`, margin + 190, y + 55);

      // Grand Total on the Right
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text("GRAND TOTAL DUE", margin + 370, y + 30);
      pdf.setFontSize(15);
      pdf.setTextColor(24, 24, 27); // black
      pdf.text(formatAmount(grandTotal, currencyStr), margin + 370, y + 50);

      y += 105;

      // Header for Individual Splits
      checkPageBreak(40);
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(24, 24, 27);
      pdf.text("INDIVIDUAL SETTLEMENT OUTCOMES", margin, y);
      y += 8;
      pdf.setDrawColor(228, 228, 231); // zinc-200
      pdf.setLineWidth(1);
      pdf.line(margin, y, margin + contentWidth, y);
      y += 18;

      // Render details for each member split card
      memberTotalSplits.forEach((split) => {
        const itemRowsCount = split.itemizedShares.length;
        const extraRows = (split.unassignedShare > 0 ? 1 : 0) + 1; // plus tax & fees share
        const rowHeight = 15;
        const totalEstimatedHeight = 25 + (itemRowsCount + extraRows) * rowHeight + 25 + 10;

        checkPageBreak(totalEstimatedHeight);

        // Render card background
        pdf.setFillColor(250, 250, 250); // very soft ivory gray
        pdf.rect(margin, y, contentWidth, totalEstimatedHeight - 10, "F");
        pdf.setDrawColor(240, 240, 241);
        pdf.rect(margin, y, contentWidth, totalEstimatedHeight - 10, "S");

        // Card Header - User Name and Total
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(24, 24, 27);
        pdf.text(split.member.name, margin + 12, y + 18);

        const totalValStr = `${formatAmount(split.totalAllocated, currencyStr)}`;
        const totalValWidth = pdf.getTextWidth(totalValStr);
        pdf.text(totalValStr, margin + contentWidth - 12 - totalValWidth, y + 18);

        // Header underline divider
        pdf.setDrawColor(235, 235, 235);
        pdf.line(margin + 12, y + 24, margin + contentWidth - 12, y + 24);

        let rowY = y + 38;

        // Courier monospaced font for receipt listing aesthetic!
        pdf.setFont("Courier", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(63, 63, 70); // zinc-700

        // Render each itemized row
        split.itemizedShares.forEach((itm) => {
          const qtyText = itm.quantity > 1 ? `${itm.quantity}x ` : "";
          const splitText = itm.splitCount > 1 ? ` (${itm.splitCount}-way split)` : "";
          const desc = `${qtyText}${itm.name}${splitText}`;
          const amtStr = formatAmount(itm.amount, currencyStr);

          pdf.text(desc, margin + 15, rowY);
          
          const amtWidth = pdf.getTextWidth(amtStr);
          pdf.text(amtStr, margin + contentWidth - 15 - amtWidth, rowY);
          rowY += rowHeight;
        });

        // Unassigned share if any
        if (split.unassignedShare > 0) {
          const desc = "Shared Unassigned Items";
          const amtStr = formatAmount(split.unassignedShare, currencyStr);
          pdf.text(desc, margin + 15, rowY);

          const amtWidth = pdf.getTextWidth(amtStr);
          pdf.text(amtStr, margin + contentWidth - 15 - amtWidth, rowY);
          rowY += rowHeight;
        }

        // Taxes & Fees share
        {
          const desc = "Proportional Taxes & Fees Share";
          const amtStr = formatAmount(split.feeShare, currencyStr);
          pdf.text(desc, margin + 15, rowY);

          const amtWidth = pdf.getTextWidth(amtStr);
          pdf.text(amtStr, margin + contentWidth - 15 - amtWidth, rowY);
          rowY += rowHeight;
        }

        // payment handles
        if (split.member.paymentHandle) {
          pdf.setFont("Helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(113, 113, 122); // zinc-500
          pdf.text(`Settle up via PayPal/Venmo URL/Username: @${split.member.paymentHandle}`, margin + 15, rowY + 3);
        }

        y += totalEstimatedHeight;
      });

      // Simple footer
      checkPageBreak(50);
      y += 10;
      pdf.setDrawColor(228, 228, 231);
      pdf.setLineWidth(1);
      pdf.line(margin, y, margin + contentWidth, y);
      y += 18;

      pdf.setFont("Helvetica", "italic");
      pdf.setFontSize(8.5);
      pdf.setTextColor(161, 161, 170); // zinc-400
      const footerText = "Thank you for using AI Studio Diner Noir Bill Splitter. Accurate dining splits powered by Gemini.";
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, margin + (contentWidth - footerWidth) / 2, y);

      // Save file
      const cleanTitle = (billDetails.title || "Bill_Split").replace(/[^a-zA-Z0-9_\-]/g, "_");
      pdf.save(`${cleanTitle}_invoice.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("An error occurred during print export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8" id="summary-panel-container">
      <div id="pdf-report-content" className="space-y-8 bg-zinc-950 p-6 border border-zinc-900 rounded-none">
        {/* Upper header similar to the Diner Noir layout */}
      <header className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-zinc-800 pb-5 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-bold mb-1">CURRENT OUTCOMES</span>
          <h1 className="text-4xl font-black tracking-tighter">THE DAMAGE</h1>
        </div>

        <div className="text-left md:text-right">
          <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-bold mb-1 block">Total Amount Due</span>
          <div className="text-4xl font-black text-[#C0FF00] tracking-tighter italic font-mono">
            {formatAmount(grandTotal, billDetails.currency)}
          </div>
        </div>
      </header>

      {/* Bill calculation details and proportional toggle switcher */}
      <div className="bg-zinc-900/60 p-4 border border-zinc-850 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 border-2 border-[#C0FF00] flex items-center justify-center font-bold text-[#C0FF00]">
            %
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-mono">Tax, Tip & Service allocation method:</p>
            <p className="text-sm font-bold text-white uppercase tracking-tight">
              {billDetails.splitTaxTipMode === "proportional" ? "Proportional to food value" : "Equal split for all heads"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onUpdateBillDetails({ ...billDetails, splitTaxTipMode: "proportional" })}
            className={`text-[9px] font-bold uppercase py-1.5 px-3 border ${
              billDetails.splitTaxTipMode === "proportional"
                ? "bg-[#C0FF00] border-transparent text-black"
                : "bg-transparent border-zinc-805 text-zinc-500 hover:text-white"
            }`}
          >
            Proportional
          </button>
          <button
            onClick={() => onUpdateBillDetails({ ...billDetails, splitTaxTipMode: "equal" })}
            className={`text-[9px] font-bold uppercase py-1.5 px-3 border ${
              billDetails.splitTaxTipMode === "equal"
                ? "bg-[#C0FF00] border-transparent text-black"
                : "bg-transparent border-zinc-805 text-zinc-500 hover:text-white"
            }`}
          >
            Splits Equally
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Ledger breakdown for each individual */}
        <div className="lg:col-span-12 space-y-4" id="ledger-individual-breakdown">
          <h2 className="text-xs tracking-[0.4em] uppercase font-bold text-zinc-400 flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-[#C0FF00]"></span>Member Share Sheets
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {memberTotalSplits.map(({ member, baseAmount, feeShare, totalAllocated, percentageOfTotal, itemizedShares, unassignedShare }) => (
              <div key={member.id} className="bg-zinc-950 border border-zinc-850 p-5 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{member.avatarEmoji}</span>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{member.name}</h4>
                      {member.paymentHandle && (
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">@{member.paymentHandle}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-white italic font-mono block">
                      {formatAmount(totalAllocated, billDetails.currency)}
                    </span>
                    <span className="text-[9px] text-[#C0FF00] font-mono leading-none">
                      {percentageOfTotal.toFixed(0)}% of total
                    </span>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full h-1 bg-zinc-900">
                  <div className="h-full bg-[#C0FF00]" style={{ width: `${percentageOfTotal}%` }}></div>
                </div>

                {/* Small itemized detail inside member summary */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Personal Course Items</p>
                  
                  {itemizedShares.length > 0 || unassignedShare > 0 ? (
                    <div className="space-y-1 text-xs">
                      {itemizedShares.map((itm) => (
                        <div key={itm.itemId} className="flex justify-between text-zinc-300 font-mono text-[11px]">
                          <span className="truncate pr-2 text-zinc-300">
                            {itm.quantity > 1 && `${itm.quantity}x `}{itm.name}
                            {itm.splitCount > 1 && (
                              <span className="text-zinc-605 text-[9px] font-normal lowercase italic ml-1">
                                ({itm.splitCount}-way)
                              </span>
                            )}
                          </span>
                          <span className="text-zinc-400 shrink-0 font-mono">
                            {formatAmount(itm.amount, billDetails.currency)}
                          </span>
                        </div>
                      ))}
                      {unassignedShare > 0 && (
                        <div className="flex justify-between text-zinc-400 font-mono text-[11px] italic">
                          <span className="truncate pr-2">Shared Unassigned Items</span>
                          <span className="shrink-0">{formatAmount(unassignedShare, billDetails.currency)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-650 italic">No items assigned</p>
                  )}

                  {/* Fees breakdown itemization */}
                  <div className="flex justify-between text-[11px] font-mono border-t border-zinc-900 border-dashed pt-1.5 text-zinc-400">
                    <span>Tax, tips, & service fees share</span>
                    <span>{formatAmount(feeShare, billDetails.currency)}</span>
                  </div>
                </div>

                {/* Optional smart payment handles trigger link */}
                {member.paymentHandle && (
                  <div className="pt-2">
                    <a
                      href={`https://venmo.com/${member.paymentHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1 text-center bg-zinc-900 hover:bg-[#C0FF00]/10 hover:text-[#C0FF00] border border-zinc-800 text-zinc-400 transition-all text-[9px] uppercase tracking-widest font-black block"
                    >
                      Venmo @{member.paymentHandle}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bill summary breakdown */}
      <div className="p-5 bg-zinc-950 border border-zinc-850 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest block">Items Subtotal</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{formatAmount(itemsSubtotal, billDetails.currency)}</p>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest block">Sales Tax</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{formatAmount(billDetails.tax, billDetails.currency)}</p>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest block">Tip</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{formatAmount(resolvedTipValue, billDetails.currency)}</p>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest block">Service Charge</span>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{formatAmount(billDetails.serviceCharge, billDetails.currency)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-4">
          <span className="text-[9px] text-zinc-400 uppercase font-mono tracking-widest block">Grand Total</span>
          <p className="text-xl font-black text-[#C0FF00] font-mono mt-0.5">{formatAmount(grandTotal, billDetails.currency)}</p>
        </div>
      </div>
      </div>

      {/* Action triggers */}
      <div className="flex flex-col md:flex-row justify-between gap-3 pt-6 border-t border-zinc-850">
        <button
          onClick={onBackToAssign}
          className="text-xs font-black uppercase tracking-[0.2em] px-4 py-3 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assigning
        </button>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCopySummary}
            className="text-xs font-black uppercase tracking-[0.2em] px-5 py-4 bg-zinc-900 border border-zinc-800 text-white hover:border-[#C0FF00] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[#C0FF00]" />
                Copied splits to Clipboard
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-zinc-500" />
                Copy Split Summary Report
              </>
            )}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="text-xs font-black uppercase tracking-[0.2em] px-5 py-4 bg-zinc-900 border border-zinc-800 text-white hover:border-[#C0FF00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#C0FF00]" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 text-zinc-500" />
                Export PDF Invoice
              </>
            )}
          </button>

          <button
            onClick={onRestart}
            className="text-xs font-black uppercase tracking-[0.2em] px-6 py-4 bg-[#C0FF00] text-black hover:bg-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Start New Bill split
          </button>
        </div>
      </div>
    </div>
  );
}
