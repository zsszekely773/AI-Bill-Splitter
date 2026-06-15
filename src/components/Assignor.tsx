import React, { useState } from "react";
import { Member, Item, BillDetails } from "../types";
import { UserCheck, AlertCircle, Sparkles, Check, HelpCircle, ArrowLeft, ArrowRight, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatAmount, getCurrencyInfo } from "../utils";

interface AssignorProps {
  members: Member[];
  items: Item[];
  onUpdateItems: (items: Item[]) => void;
  billDetails: BillDetails;
  onUpdateBillDetails: (details: BillDetails) => void;
  onProceedToSummary: () => void;
  onBackToItems: () => void;
}

export default function Assignor({
  members,
  items,
  onUpdateItems,
  billDetails,
  onUpdateBillDetails,
  onProceedToSummary,
  onBackToItems,
}: AssignorProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || "");
  const [showTaxTipSettings, setShowTaxTipSettings] = useState(false);

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const resolvedTipAmount =
    billDetails.tipType === "percentage"
      ? (itemsSubtotal * (billDetails.tipPercentage || 0)) / 100
      : (billDetails.tip || 0);

  const selectedItem = items.find((itm) => itm.id === selectedItemId);
  const currentIndex = items.findIndex((itm) => itm.id === selectedItemId);

  // Helper to obtain initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Toggle assignment of an item to a specific person
  const handleToggleAssignment = (itemId: string, memberId: string) => {
    const updated = items.map((item) => {
      if (item.id === itemId) {
        const assigned = [...item.assignedTo];
        const index = assigned.indexOf(memberId);
        if (index > -1) {
          assigned.splice(index, 1);
        } else {
          assigned.push(memberId);
        }
        return { ...item, assignedTo: assigned };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  // Assign to ALL members
  const handleAssignAll = (itemId: string) => {
    const updated = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, assignedTo: members.map((m) => m.id) };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  // Clear assignments for an item
  const handleClearAssignments = (itemId: string) => {
    const updated = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, assignedTo: [] };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const selectedAssignedCount = selectedItem?.assignedTo.length || 0;
  const anyUnassigned = items.some((item) => item.assignedTo.length === 0);

  // Auto assign entire bill evenly to everyone
  const handleAutoAssignAllItemsEqually = () => {
    const updated = items.map((item) => ({
      ...item,
      assignedTo: members.map((m) => m.id),
    }));
    onUpdateItems(updated);
  };

  return (
    <div className="space-y-8" id="assignor-panel-container">
      {/* Header section with step indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-5 gap-4">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-bold mb-1 block">Step 3 of 4</span>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-[#C0FF00]" />
            ASSIGN ITEMS
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Tap a course, then select who is eating/sharing it. Unassigned items are highlighted in warning red.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAutoAssignAllItemsEqually}
            className="text-[10px] uppercase tracking-widest font-black px-3.5 py-2 border border-zinc-800 text-zinc-400 hover:text-[#C0FF00] hover:border-[#C0FF00] transition-colors cursor-pointer"
          >
            Split All 50/50
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: List of standard items */}
        <div className="lg:col-span-7 space-y-3" id="items-assignment-list">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-bold">Menu & Courses ({items.length})</span>
            {anyUnassigned && (
              <span className="text-[10px] tracking-wide text-rose-500 font-bold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Some items unassigned
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {items.map((item) => {
              const isActive = item.id === selectedItemId;
              const hasAssignment = item.assignedTo.length > 0;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full text-left p-3.5 border transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-zinc-900 border-[#C0FF00] shadow-sm"
                      : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold tracking-tight ${isActive ? "text-[#C0FF00]" : "text-white"}`}>
                          {item.name}
                        </span>
                        {item.quantity > 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-mono">
                            Qty: {item.quantity}
                          </span>
                        )}
                      </div>

                      {/* Member badges tags summary inside items list */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {hasAssignment ? (
                          item.assignedTo.map((mId) => {
                            const match = members.find((m) => m.id === mId);
                            if (!match) return null;
                            return (
                              <span
                                key={mId}
                                className="text-[9px] font-bold px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-[#C0FF00] flex items-center gap-1"
                              >
                                {match.avatarEmoji} {getInitials(match.name)}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-950/20 border border-rose-950/70 text-rose-400 uppercase tracking-tighter">
                            Unassigned (split evenly)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-white italic font-mono">
                        {formatAmount(item.price * item.quantity, billDetails.currency)}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {item.quantity} × {formatAmount(item.price, billDetails.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Target Item assignee settings */}
        <div className="lg:col-span-5 space-y-5" id="assignment-editor-details">
          {selectedItem ? (
            <div className="bg-zinc-900 border border-zinc-850 p-5 space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] tracking-[0.2em] uppercase text-zinc-500 font-bold block">Currently Splitting</span>
                <div className="flex gap-1">
                  <button
                    disabled={currentIndex <= 0}
                    onClick={() => setSelectedItemId(items[currentIndex - 1].id)}
                    className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Previous item"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    disabled={currentIndex >= items.length - 1 || currentIndex === -1}
                    onClick={() => setSelectedItemId(items[currentIndex + 1].id)}
                    className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Next item"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-black italic tracking-tight text-white pr-2">{selectedItem.name}</h3>
                  <span className="text-xs bg-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded-none font-bold whitespace-nowrap">
                    QTY: {selectedItem.quantity}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-1 border-b border-zinc-800 pb-3">
                  <span className="text-[11px] font-mono text-zinc-400">
                    {selectedItem.quantity > 1 
                      ? `${formatAmount(selectedItem.price, billDetails.currency)} × ${selectedItem.quantity}` 
                      : "Total item price"
                    }
                  </span>
                  <span className="text-2xl font-black text-[#C0FF00] font-mono">{formatAmount(selectedItem.price * selectedItem.quantity, billDetails.currency)}</span>
                </div>
              </div>

              {/* Assignments triggers for selecting members */}
              <div className="space-y-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 font-extrabold block">Who shares this?</span>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {members.map((member) => {
                    const isAssigned = selectedItem.assignedTo.includes(member.id);
                    const costPerPerson = isAssigned
                      ? (selectedItem.price * selectedItem.quantity) / selectedAssignedCount
                      : 0;

                    return (
                      <div
                        key={member.id}
                        onClick={() => handleToggleAssignment(selectedItem.id, member.id)}
                        className={`p-3 border flex items-center justify-between transition-all cursor-pointer ${
                          isAssigned
                            ? "bg-zinc-950 border-[#C0FF00]/50 text-white"
                            : "bg-zinc-950/30 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 border flex items-center justify-center ${isAssigned ? "bg-[#C0FF00] border-transparent" : "border-zinc-700"}`}>
                            {isAssigned && <Check className="h-3 w-3 text-black stroke-[3px]" />}
                          </div>
                          <span className="text-base select-none">{member.avatarEmoji}</span>
                          <span className="font-semibold text-sm tracking-tight">{member.name}</span>
                        </div>

                        {isAssigned && (
                          <span className="text-xs font-mono font-bold text-[#C0FF00]">
                            +{formatAmount(costPerPerson, billDetails.currency)}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {members.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-zinc-800 text-zinc-500 text-xs">
                      No members added yet. Go back to step 1 to add members!
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions for item splitting */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleAssignAll(selectedItem.id)}
                  className="text-[10px] uppercase tracking-widest font-black py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-zinc-300 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleClearAssignments(selectedItem.id)}
                  className="text-[10px] uppercase tracking-widest font-black py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-rose-400 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-850 p-6 text-center text-zinc-600">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 text-zinc-800" />
              <p className="text-xs uppercase tracking-wider">No food item selected</p>
            </div>
          )}

          {/* Tax, Tip, & Service Charges section inline inside assignment stage */}
          <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
            <button
              onClick={() => setShowTaxTipSettings(!showTaxTipSettings)}
              className="w-full p-4 flex justify-between items-center bg-zinc-900/40 text-left cursor-pointer transition-all hover:bg-zinc-900/65"
            >
              <div>
                <h4 className="text-xs tracking-[0.2em] font-extrabold uppercase text-white">TAX, TIP & FEES</h4>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Tax: <span className="text-white font-bold">{formatAmount(billDetails.tax, billDetails.currency)}</span> •{" "}
                  Tip: <span className="text-white font-bold">{billDetails.tipType === "percentage" ? `${billDetails.tipPercentage}% (${formatAmount(resolvedTipAmount, billDetails.currency)})` : formatAmount(billDetails.tip, billDetails.currency)}</span> •{" "}
                  Fee: <span className="text-white font-bold">{formatAmount(billDetails.serviceCharge, billDetails.currency)}</span>
                </p>
              </div>
              <span className={`text-[10px] uppercase font-bold text-[#C0FF00] border border-zinc-800 px-2 py-1`}>
                {showTaxTipSettings ? "Close" : "Adjust"}
              </span>
            </button>

            {showTaxTipSettings && (
              <div className="p-4 border-t border-zinc-900 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                      Sales Tax ({getCurrencyInfo(billDetails.currency).symbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={billDetails.tax || ""}
                      onChange={(e) => onUpdateBillDetails({ ...billDetails, tax: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                      Service Fee ({getCurrencyInfo(billDetails.currency).symbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={billDetails.serviceCharge || ""}
                      onChange={(e) => onUpdateBillDetails({ ...billDetails, serviceCharge: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Tip / Gratuity
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateBillDetails({ ...billDetails, tipType: "percentage" })}
                      className={`text-[9px] font-bold uppercase py-1 px-2.5 border ${
                        billDetails.tipType === "percentage"
                          ? "bg-white border-transparent text-black"
                          : "bg-transparent border-zinc-800 text-zinc-400"
                      }`}
                    >
                      Percent (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateBillDetails({ ...billDetails, tipType: "flat" })}
                      className={`text-[9px] font-bold uppercase py-1 px-2.5 border ${
                        billDetails.tipType === "flat"
                          ? "bg-white border-transparent text-black"
                          : "bg-transparent border-zinc-800 text-zinc-400"
                      }`}
                    >
                      Flat ({getCurrencyInfo(billDetails.currency).symbol})
                    </button>
                  </div>

                  {billDetails.tipType === "percentage" ? (
                    <div className="flex gap-1.5 pt-1">
                      {[10, 15, 18, 20, 22].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => onUpdateBillDetails({ ...billDetails, tipPercentage: pct, tip: 0 })}
                          className={`flex-1 py-1 text-xs font-mono font-bold border ${
                            billDetails.tipPercentage === pct
                              ? "bg-[#C0FF00]/15 border-[#C0FF00] text-[#C0FF00]"
                              : "border-zinc-850 bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={billDetails.tip || ""}
                        onChange={(e) => onUpdateBillDetails({ ...billDetails, tip: parseFloat(e.target.value) || 0, tipPercentage: 0 })}
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Tax & Tip allocation mode */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Split Method for Tax/Tip
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateBillDetails({ ...billDetails, splitTaxTipMode: "proportional" })}
                      className={`py-2 text-[9px] font-bold uppercase border ${
                        billDetails.splitTaxTipMode === "proportional"
                          ? "bg-[#C0FF00] border-transparent text-black"
                          : "bg-zinc-900 border-zinc-850 text-zinc-400"
                      }`}
                    >
                      Proportional
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateBillDetails({ ...billDetails, splitTaxTipMode: "equal" })}
                      className={`py-2 text-[9px] font-bold uppercase border ${
                        billDetails.splitTaxTipMode === "equal"
                          ? "bg-[#C0FF00] border-transparent text-black"
                          : "bg-zinc-900 border-zinc-850 text-zinc-400"
                      }`}
                    >
                      Equally Split
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-500 italic leading-relaxed pt-1">
                    {billDetails.splitTaxTipMode === "proportional"
                      ? "* Proportionate split matches taxes to the cost of your items."
                      : "* Split equally divides total tax, tips, and fees evenly across group members."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation action bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-zinc-900">
        <button
          onClick={onBackToItems}
          className="text-xs font-black uppercase tracking-[0.2em] px-4 py-3 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Recipes
        </button>

        <button
          onClick={onProceedToSummary}
          disabled={items.length === 0}
          className="text-xs font-black uppercase tracking-[0.2em] px-6 py-4 bg-[#C0FF00] hover:bg-white text-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          Calculate Splitting (Summary)
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
