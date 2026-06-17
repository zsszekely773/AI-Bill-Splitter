import React, { useState } from "react";
import { Member } from "../types";
import { Plus, X, User, DollarSign, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const EMOJIS = [
  "🍕", "🍔", "🌮", "🍣", "🥗", "🥑", "🍩", "🍷", "☕",
  "🦁", "🐯", "🐼", "🦊", "🐨", "🐙", "🦖", "🦄", "🚀",
  "🎮", "🎸", "🎨", "⚽", "🕶️", "👑", "🎩", "🐱", "🐶"
];

const COLORS = [
  "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25",
  "bg-violet-500/15 border-violet-500/30 text-violet-400 hover:bg-violet-500/25",
  "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25",
  "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25",
  "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25",
  "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/25",
  "bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25",
  "bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25",
  "bg-teal-500/15 border-teal-500/30 text-teal-400 hover:bg-teal-500/25"
];

interface MemberRosterProps {
  members: Member[];
  onAddMember: (member: Member) => void;
  onRemoveMember: (id: string) => void;
  onClearValues?: () => void;
}

export default function MemberRoster({ members, onAddMember, onRemoveMember, onClearValues }: MemberRosterProps) {
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Pick random color and avatar logic
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newMember: Member = {
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: name.trim(),
      color: randomColor,
      avatarEmoji: selectedEmoji,
    };

    onAddMember(newMember);
    setName("");
    // Cycle to a new random emoji for variety
    setSelectedEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  };

  const promoteQuickMembers = () => {
    const defaultGuests = ["Alice", "Bob", "Charlie", "Diana"];
    defaultGuests.forEach((n, idx) => {
      if (!members.some(m => m.name.toLowerCase() === n.toLowerCase())) {
        const emoji = EMOJIS[idx % EMOJIS.length];
        const color = COLORS[idx % COLORS.length];
        onAddMember({
          id: `mem_preset_${idx}_${Date.now()}`,
          name: n,
          color,
          avatarEmoji: emoji
        });
      }
    });
  };

  return (
    <div className="space-y-6" id="member-roster-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <User className="h-5 w-5 text-[#C0FF00]" />
            1. Group Members
          </h2>
          <p className="text-xs text-zinc-400">Add everyone who is splitting the bill.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {members.length === 0 && (
            <button
              type="button"
              onClick={promoteQuickMembers}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-none bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-[#C0FF00] hover:border-[#C0FF00] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              Quick Presets
            </button>
          )}
          {onClearValues && (
            <button
              type="button"
              onClick={onClearValues}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-none bg-zinc-950 border border-dashed border-zinc-805 text-rose-400 hover:text-rose-350 hover:border-rose-400/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Clear Values
            </button>
          )}
        </div>
      </div>

      {/* Roster list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" id="roster-list">
        <AnimatePresence>
          {members.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`flex items-center justify-between p-4 rounded-none border bg-zinc-900 border-zinc-800 hover:border-[#C0FF00] transition-all duration-200 relative group`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">{member.avatarEmoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm tracking-tight">{member.name}</p>
                  {member.paymentHandle && (
                    <span className="flex items-center text-[9px] text-zinc-400 font-mono mt-0.5">
                      <DollarSign className="h-2.5 w-2.5 text-[#C0FF00]" />
                      {member.paymentHandle}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Accent neon neon block */}
                <span className="w-1.5 h-1.5 bg-[#C0FF00]" />

                <button
                  type="button"
                  onClick={() => onRemoveMember(member.id)}
                  className="p-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:border-rose-500 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer text-[10px]"
                  title={`Remove ${member.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {members.length === 0 && (
          <div className="col-span-full py-10 text-center bg-zinc-950/25 border border-zinc-850 border-dashed rounded-none">
            <User className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-400">No members registered yet</p>
            <p className="text-[11px] text-zinc-650 mt-1">Use the quick presets, or register new member sheets below.</p>
          </div>
        )}
      </div>

      {/* Add member form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-none bg-zinc-950 border border-zinc-900 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Name input */}
          <div className="md:col-span-8">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Member Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rachel, Marcus, Julie"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-805 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] placeholder:text-zinc-700 font-sans"
              maxLength={25}
            />
          </div>

          {/* Emoji Avatar choices */}
          <div className="md:col-span-4">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Avatar Icon
            </label>
            <select
              value={selectedEmoji}
              onChange={(e) => setSelectedEmoji(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-805 rounded-none px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C0FF00] cursor-pointer"
            >
              {EMOJIS.map((emoji) => (
                <option key={emoji} value={emoji}>
                  {emoji} Avatar
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-2.5 px-3 rounded-none font-black text-xs uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-[#C0FF00] text-black hover:bg-white active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          Register Member
        </button>
      </form>
    </div>
  );
}
