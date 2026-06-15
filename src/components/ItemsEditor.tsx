import React, { useState } from "react";
import { Item, BillDetails } from "../types";
import { Trash2, Plus, ArrowRight, ClipboardList, RefreshCw, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatAmount, getCurrencyInfo } from "../utils";

interface ItemsEditorProps {
  items: Item[];
  onUpdateItems: (items: Item[]) => void;
  billDetails: BillDetails;
  onUpdateBillDetails: (details: BillDetails) => void;
  onProceedToAssign: () => void;
  onRestart: () => void;
  currency?: string;
}

export default function ItemsEditor({
  items,
  onUpdateItems,
  billDetails,
  onUpdateBillDetails,
  onProceedToAssign,
  onRestart,
  currency = "HUF"
}: ItemsEditorProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);

  // Calculate Running Subtotal
  const runningSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Add Item Row
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;

    const parsedPrice = parseFloat(newItemPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) return;

    const newItem: Item = {
      id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: newItemName.trim(),
      price: parsedPrice,
      quantity: newItemQty,
      assignedTo: [],
    };

    onUpdateItems([...items, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty(1);
  };

  // Update specific item property
  const handleUpdateItemProperty = (id: string, updates: Partial<Item>) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  // Remove individual item row
  const handleRemoveItem = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    onUpdateItems(filtered);
  };

  return (
    <div className="space-y-6" id="items-editor-wrapper">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#C0FF00]" />
            2. Review & Edit Items
          </h2>
          <p className="text-xs text-zinc-400">
            Double check quantities, edit description, or add missing courses to adjust the bill.
          </p>
        </div>

        <button
          onClick={onRestart}
          className="text-xs px-3 py-2 rounded-none font-bold uppercase tracking-widest bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="h-3 w-3" />
          Re-scan Image
        </button>
      </div>

      {/* Responsive Table/List of products */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-none overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-zinc-600">
            <ClipboardList className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
            <p className="text-sm uppercase tracking-wider font-bold">No standard items detected</p>
            <p className="text-xs text-zinc-500 mt-1">Use the quick add form below to declare course items manually.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[340px] sm:min-w-0">
              <thead>
                <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400 text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest font-extrabold uppercase">
                  <th className="p-1.5 sm:p-3.5">Item Description</th>
                  <th className="p-1.5 sm:p-3.5 w-16 sm:w-32 text-center font-mono">Price ({getCurrencyInfo(currency).symbol})</th>
                  <th className="p-1.5 sm:p-3.5 w-14 sm:w-24 text-center">Qty</th>
                  <th className="p-1.5 sm:p-3.5 w-20 sm:w-32 text-right font-mono">Total</th>
                  <th className="p-1.5 sm:p-3.5 w-8 sm:w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-zinc-900 bg-black/40 hover:bg-zinc-900/10 transition-all text-white align-middle"
                    >
                      {/* Name Inline Input */}
                      <td className="p-1.5 sm:p-3.5 min-w-[100px] sm:min-w-[150px]">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItemProperty(item.id, { name: e.target.value })}
                          className="w-full bg-transparent p-0.5 -m-0.5 border border-transparent hover:border-zinc-850 focus:border-[#C0FF00] rounded-none focus:outline-none transition-all font-semibold italic text-zinc-100 text-[11px] sm:text-xs md:text-sm"
                        />
                      </td>

                      {/* Price Inline Input */}
                      <td className="p-1.5 sm:p-3.5 w-16 sm:w-32 min-w-[55px] sm:min-w-[100px]">
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateItemProperty(item.id, { price: val });
                          }}
                          className="w-full bg-transparent p-0.5 -m-0.5 border border-transparent hover:border-zinc-850 focus:border-[#C0FF00] focus:outline-none rounded-none text-center font-mono font-medium text-zinc-100 text-[11px] sm:text-xs md:text-sm"
                        />
                      </td>

                      {/* Quantity Incrementor */}
                      <td className="p-1.5 sm:p-3.5 w-14 sm:w-24 min-w-[65px] sm:min-w-[80px]">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemProperty(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                            className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all cursor-pointer font-bold text-[9px] sm:text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono text-center w-4 sm:w-5 text-[10px] sm:text-xs font-bold text-zinc-300">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemProperty(item.id, { quantity: item.quantity + 1 })}
                            className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all cursor-pointer font-bold text-[9px] sm:text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Row Total (Quantity * price) */}
                      <td className="p-1.5 sm:p-3.5 w-20 sm:w-32 min-w-[65px] text-right font-mono font-black italic text-[#C0FF00] pr-1.5 sm:pr-5 text-[11px] sm:text-xs md:text-sm">
                        {formatAmount(item.price * item.quantity, currency)}
                      </td>

                      {/* Delete Trigger */}
                      <td className="p-1.5 sm:p-3.5 w-8 sm:w-12 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-500/80 hover:text-rose-400 p-0.5 rounded-none hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Total Ledger Subbar with Tax, Tip & Fees */}
        <div className="p-4 bg-zinc-900/30 border-t border-zinc-900 space-y-3.5">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-mono uppercase tracking-wider font-bold">Itemized Subtotal</span>
            <span className="font-mono text-zinc-300 font-bold">
              {formatAmount(runningSubtotal, currency)}
            </span>
          </div>

          {/* Sales Tax */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-mono uppercase tracking-wider">Sales Tax ({getCurrencyInfo(currency).symbol})</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={billDetails.tax || ""}
                onChange={(e) => onUpdateBillDetails({ ...billDetails, tax: parseFloat(e.target.value) || 0 })}
                className="w-24 bg-zinc-950 border border-zinc-800 focus:border-[#C0FF00] px-2 py-1 text-right font-mono text-xs focus:outline-none text-white rounded-none"
              />
            </div>
          </div>

          {/* Service Fee */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-mono uppercase tracking-wider">Service Fee ({getCurrencyInfo(currency).symbol})</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={billDetails.serviceCharge || ""}
                onChange={(e) => onUpdateBillDetails({ ...billDetails, serviceCharge: parseFloat(e.target.value) || 0 })}
                className="w-24 bg-zinc-950 border border-zinc-800 focus:border-[#C0FF00] px-2 py-1 text-right font-mono text-xs focus:outline-none text-white rounded-none"
              />
            </div>
          </div>

          {/* Tip / Gratuity */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono uppercase tracking-wider text-xs">Tip / Gratuity</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateBillDetails({ ...billDetails, tipType: "percentage" })}
                  className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border ${
                    billDetails.tipType === "percentage"
                      ? "bg-white border-transparent text-black"
                      : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateBillDetails({ ...billDetails, tipType: "flat" })}
                  className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border ${
                    billDetails.tipType === "flat"
                      ? "bg-white border-transparent text-black"
                      : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Flat
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 font-mono">
              {billDetails.tipType === "percentage" ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={billDetails.tipPercentage || ""}
                    onChange={(e) => onUpdateBillDetails({ ...billDetails, tipPercentage: parseFloat(e.target.value) || 0, tip: 0 })}
                    className="w-14 bg-zinc-950 border border-zinc-800 focus:border-[#C0FF00] px-2 py-1 text-right font-mono text-xs focus:outline-none text-white rounded-none"
                  />
                  <span className="text-zinc-400 text-xs">%</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ({formatAmount((runningSubtotal * (billDetails.tipPercentage || 0)) / 100, currency)})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={billDetails.tip || ""}
                    onChange={(e) => onUpdateBillDetails({ ...billDetails, tip: parseFloat(e.target.value) || 0, tipPercentage: 0 })}
                    className="w-24 bg-zinc-950 border border-zinc-800 focus:border-[#C0FF00] px-2 py-1 text-right font-mono text-xs focus:outline-none text-white rounded-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Grand split total count */}
          <div className="flex justify-between items-center border-t border-zinc-800 pt-3">
            <span className="text-[#C0FF00] text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold">Grand Split Total</span>
            <span className="text-2xl font-black font-mono text-[#C0FF00] tracking-tight italic">
              {formatAmount(
                runningSubtotal +
                billDetails.tax +
                billDetails.serviceCharge +
                (billDetails.tipType === "percentage" ? (runningSubtotal * billDetails.tipPercentage) / 100 : billDetails.tip),
                currency
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Row adding drawer */}
      <form onSubmit={handleAddItem} className="p-4 rounded-none bg-zinc-950 border border-zinc-900 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="grow">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Add Custom Row Item
            </label>
            <input
              type="text"
              placeholder="e.g. Margarita Cocktail, Ribeye steak..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] placeholder:text-zinc-700 font-sans"
            />
          </div>

          <div className="w-full sm:w-36">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Price ({getCurrencyInfo(currency).symbol})
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] placeholder:text-zinc-700 font-mono"
            />
          </div>

          <div className="w-full sm:w-20">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Qty
            </label>
            <select
              value={newItemQty}
              onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] font-mono cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!newItemName.trim() || !newItemPrice}
            className="px-4 py-2 rounded-none font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-800 text-[#C0FF00] hover:bg-zinc-850 cursor-pointer text-center"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
        </div>
      </form>

      {/* Action triggers */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onProceedToAssign}
          disabled={items.length === 0}
          className="w-full sm:w-[320px] bg-[#C0FF00] text-black font-black uppercase tracking-[0.2em] py-4 text-xs hover:bg-white transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          Assign To Group members
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
