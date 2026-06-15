import React, { useState, useEffect } from "react";
import { Member, Item, BillDetails, ParsedReceiptResponse } from "./types";
import MemberRoster from "./components/MemberRoster";
import ReceiptLoader from "./components/ReceiptLoader";
import ItemsEditor from "./components/ItemsEditor";
import Assignor from "./components/Assignor";
import SplitSummary from "./components/SplitSummary";
import { User, FileText, ClipboardList, UserCheck, Receipt, ArrowRight, ArrowLeft } from "lucide-react";
import { formatAmount, CURRENCIES } from "./utils";

type SplittingStep = "ROSTER" | "CAPTURE" | "ITEMS" | "ASSIGN" | "SUMMARY";

export default function App() {
  const [step, setStep] = useState<SplittingStep>("ROSTER");
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [billDetails, setBillDetails] = useState<BillDetails>({
    title: "DINER_NOIR_99",
    tax: 0,
    tip: 0,
    tipType: "flat",
    tipPercentage: 0,
    serviceCharge: 0,
    splitTaxTipMode: "proportional",
    currency: "HUF",
  });
  
  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    title: string;
    message: string;
    actionType: "RESTART" | "CLEAR" | null;
  }>({
    show: false,
    title: "",
    message: "",
    actionType: null,
  });

  // Load state from local storage on startup for durable persistence
  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem("bs_members");
      const savedItems = localStorage.getItem("bs_items");
      const savedDetails = localStorage.getItem("bs_details");

      if (savedMembers) setMembers(JSON.parse(savedMembers));
      if (savedItems) setItems(JSON.parse(savedItems));
      if (savedDetails) {
        const parsed = JSON.parse(savedDetails);
        if (!parsed.currency) {
          parsed.currency = "HUF";
        }
        setBillDetails(parsed);
      }
    } catch (e) {
      console.error("Failed to load bill splitter state from localStorage:", e);
    }
  }, []);

  // Save state whenever members or items change
  const handleUpdateMembers = (updated: Member[]) => {
    setMembers(updated);
    localStorage.setItem("bs_members", JSON.stringify(updated));
  };

  const handleUpdateItems = (updated: Item[]) => {
    setItems(updated);
    localStorage.setItem("bs_items", JSON.stringify(updated));
  };

  const handleUpdateBillDetails = (updated: BillDetails) => {
    setBillDetails(updated);
    localStorage.setItem("bs_details", JSON.stringify(updated));
  };

  // Add a member
  const handleAddMember = (member: Member) => {
    handleUpdateMembers([...members, member]);
  };

  // Remove member
  const handleRemoveMember = (id: string) => {
    // Filter members list
    const updated = members.filter((m) => m.id !== id);
    handleUpdateMembers(updated);

    // Remove participation from all items
    const cleanedItems = items.map((item) => ({
      ...item,
      assignedTo: item.assignedTo.filter((mId) => mId !== id),
    }));
    handleUpdateItems(cleanedItems);
  };

  // When Receipt parsing completes from Gemini
  const handleParsingComplete = (data: ParsedReceiptResponse) => {
    const parsedItems: Item[] = (data.items || []).map((itm, idx) => ({
      id: "raw_item_" + idx + "_" + Date.now(),
      name: itm.name || `Receipt Item #${idx + 1}`,
      price: typeof itm.price === "number" ? itm.price : 0,
      quantity: typeof itm.quantity === "number" ? Math.max(1, itm.quantity) : 1,
      assignedTo: [],
    }));

    handleUpdateItems(parsedItems);
    handleUpdateBillDetails({
      ...billDetails,
      tax: data.tax || 0,
      tip: data.tip || 0,
      tipType: data.tip ? "flat" : "percentage",
      serviceCharge: data.serviceCharge || 0,
    });
    setStep("ITEMS");
  };

  // Skip step
  const handleSkipToManual = () => {
    setStep("ITEMS");
  };

  // Restart everything completely to initial state
  const handleRestart = () => {
    setConfirmState({
      show: true,
      title: "START NEW BILL SPLIT",
      message: "Are you sure you want to start a new bill split? This will completely clear members, food items, settings, and all current standings to start fresh.",
      actionType: "RESTART",
    });
  };

  // Clear all values entirely with a simple startover back to initial
  const handleClearValues = () => {
    setConfirmState({
      show: true,
      title: "CLEAR CURRENT STANDINGS",
      message: "Are you sure you want to clear all members, food items, and settings to start over?",
      actionType: "CLEAR",
    });
  };

  // Clean wipe executor
  const executeConfirmedAction = () => {
    handleUpdateMembers([]);
    handleUpdateItems([]);
    handleUpdateBillDetails({
      title: `DINER_NOIR_${Math.floor(Math.random() * 100) + 1}`,
      tax: 0,
      tip: 0,
      tipType: "flat",
      tipPercentage: 0,
      serviceCharge: 0,
      splitTaxTipMode: "proportional",
      currency: "HUF",
    });
    setStep("ROSTER");
    setConfirmState({ show: false, title: "", message: "", actionType: null });
  };

  // Calculate Running Values
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const resolvedTipAmount =
    billDetails.tipType === "percentage"
      ? (itemsSubtotal * billDetails.tipPercentage) / 100
      : billDetails.tip;
  const grandTotal = itemsSubtotal + billDetails.tax + billDetails.serviceCharge + resolvedTipAmount;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#C0FF00] selection:text-black">
      {/* Outer core wrapper */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Artistic Flair display header banner */}
        <header className="flex flex-col md:flex-row justify-between items-baseline mb-8 border-b border-zinc-800 pb-5 gap-4">
          <div className="flex flex-col sm:flex-row gap-6 items-baseline w-full md:w-auto">
            <div className="flex flex-col">
              <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-extrabold mb-1">
                Active OCR Splitter
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={billDetails.title}
                  onChange={(e) => handleUpdateBillDetails({ ...billDetails, title: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  className="text-4xl font-black tracking-tighter bg-transparent text-white border-b border-transparent hover:border-zinc-800 focus:border-[#C0FF00] focus:outline-none uppercase w-full max-w-sm "
                  placeholder="SESSION_NAME"
                />
              </div>
            </div>

            <div className="flex flex-col shrink-0">
              <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-extrabold mb-1">
                Currency Mode
              </span>
              <select
                value={billDetails.currency || "HUF"}
                onChange={(e) => handleUpdateBillDetails({ ...billDetails, currency: e.target.value })}
                className="bg-black text-[11px] font-black uppercase tracking-widest text-[#C0FF00] border border-zinc-800 focus:border-[#C0FF00] p-1.5 px-3 focus:outline-none rounded-none cursor-pointer hover:border-zinc-700 transition-colors"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code} className="bg-zinc-950 font-sans font-medium text-xs text-white">
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="text-left md:text-right shrink-0">
            <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-extrabold mb-1 block">
              Grand Split Total
            </span>
            <div className="text-4xl font-black text-[#C0FF00] tracking-tighter italic font-mono transition-all">
              {formatAmount(grandTotal, billDetails.currency)}
            </div>
          </div>
        </header>

        {/* Wizard Progression steps map (Static Tab Bar) */}
        <div className="border-b border-zinc-800 mb-8 flex flex-nowrap overflow-x-auto select-none scrollbar-none scroll-smooth">
          {[
            { key: "ROSTER", label: "Group Roster", icon: User },
            { key: "CAPTURE", label: "Receipt Scan", icon: FileText },
            { key: "ITEMS", label: "Verify Food", icon: ClipboardList },
            { key: "ASSIGN", label: "Assign Shares", icon: UserCheck },
            { key: "SUMMARY", label: "Final Damage", icon: Receipt },
          ].map((item, index) => {
            const isActive = step === item.key;
            const isSelectable = 
              item.key === "ROSTER" ||
              (item.key === "CAPTURE" && members.length > 0) ||
              (item.key === "ITEMS" && items.length > 0) ||
              (item.key === "ASSIGN" && items.length > 0 && members.length > 0) ||
              (item.key === "SUMMARY" && items.length > 0 && members.length > 0);

            return (
              <button
                key={item.key}
                disabled={!isSelectable}
                onClick={() => setStep(item.key as SplittingStep)}
                className={`flex-1 min-w-[125px] pb-3 text-center border-b-2 transition-all duration-200 outline-none ${
                  isActive
                    ? "border-[#C0FF00] text-white font-extrabold"
                    : isSelectable
                    ? "border-transparent text-zinc-400 hover:text-white cursor-pointer"
                    : "border-transparent text-zinc-700 cursor-not-allowed"
                }`}
              >
                <div className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">
                  0{index + 1}
                </div>
                <div className="flex items-center justify-center gap-1.5 px-2">
                  <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-[#C0FF00]" : "text-zinc-500"}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic State views mapping switcher */}
        <main className="min-h-[400px] bg-zinc-950 p-6 md:p-8 border border-zinc-900">
          {step === "ROSTER" && (
            <div className="space-y-6">
              <MemberRoster
                members={members}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onClearValues={handleClearValues}
              />
              
              <div className="flex justify-end items-center pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setStep("CAPTURE")}
                  disabled={members.length === 0}
                  className="px-6 py-3.5 bg-[#C0FF00] text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 transition-all"
                >
                  Proceed to Scan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === "CAPTURE" && (
            <div className="space-y-6">
              <ReceiptLoader
                onParsingComplete={handleParsingComplete}
                onSkipToManual={handleSkipToManual}
              />
              
              <div className="flex justify-between pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setStep("ROSTER")}
                  className="px-4 py-2 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white transition-all text-[10px] uppercase tracking-widest font-black cursor-pointer"
                >
                  Back to members
                </button>
              </div>
            </div>
          )}

          {step === "ITEMS" && (
            <ItemsEditor
              items={items}
              onUpdateItems={handleUpdateItems}
              billDetails={billDetails}
              onUpdateBillDetails={handleUpdateBillDetails}
              onProceedToAssign={() => setStep("ASSIGN")}
              onRestart={() => setStep("CAPTURE")}
              currency={billDetails.currency || "HUF"}
            />
          )}

          {step === "ASSIGN" && (
            <Assignor
              members={members}
              items={items}
              onUpdateItems={handleUpdateItems}
              billDetails={billDetails}
              onUpdateBillDetails={handleUpdateBillDetails}
              onProceedToSummary={() => setStep("SUMMARY")}
              onBackToItems={() => setStep("ITEMS")}
            />
          )}

          {step === "SUMMARY" && (
            <SplitSummary
              members={members}
              items={items}
              billDetails={billDetails}
              onUpdateBillDetails={handleUpdateBillDetails}
              onRestart={handleRestart}
              onBackToAssign={() => setStep("ASSIGN")}
            />
          )}
        </main>

        {/* Brand visual aesthetic footer matching Diner Noir */}
        <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center bg-black py-4 border-t border-zinc-900 gap-4 text-center sm:text-left">
          <div className="text-[10px] text-zinc-500 tracking-[0.25em] font-mono">
            V2.0.4_BETA // OCR_GEMINI_3.5_FLASH // SECURE_COMMUNICATION
          </div>
          
          <div className="flex gap-3">
            <span className="px-2 py-1 border border-zinc-900 text-[9px] font-bold text-zinc-500 uppercase font-mono">
              AI Ready
            </span>
            <span className="px-2 py-1 border border-zinc-900 text-[9px] font-bold text-zinc-500 uppercase font-mono">
              Offline First
            </span>
          </div>
        </footer>

        {/* Custom Confirmation Modal */}
        {confirmState.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-zinc-950 border-2 border-zinc-900 max-w-sm w-full p-6 space-y-5 rounded-none shadow-2xl relative">
              {/* Dynamic decorative neon header bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-[#C0FF00] to-rose-500"></div>
              
              <div className="space-y-2 pt-2">
                <span className="text-[9px] tracking-[0.3em] font-mono text-rose-450 font-bold uppercase block">
                  SYSTEM CONFIRMATION REQUIRED
                </span>
                <h3 className="text-lg font-black text-white tracking-tight uppercase">
                  {confirmState.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmState({ show: false, title: "", message: "", actionType: null })}
                  className="py-2.5 px-4 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedAction}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest cursor-pointer transition-all rounded-none"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
