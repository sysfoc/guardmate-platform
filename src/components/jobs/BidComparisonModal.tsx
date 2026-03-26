import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import type { IBid, IJob } from '@/types/job.types';

interface BidComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  bids: IBid[];
  job: IJob;
  onAccept: (bidId: string) => void;
  onReject: (bidId: string) => void;
  isAccepting?: boolean;
}

export function BidComparisonModal({
  isOpen,
  onClose,
  bids,
  job,
  onAccept,
  onReject,
  isAccepting = false,
}: BidComparisonModalProps) {
  if (!isOpen || bids.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Comparing ${bids.length} Bids`} size="xl">
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-[700px]">
          <thead>
            <tr>
              <th className="p-2 sm:p-3 border-b border-[var(--color-border-primary)] w-24 sm:w-32 md:w-40 sticky left-0 bg-white dark:bg-slate-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" />
              {bids.map(bid => (
                <th key={bid.bidId} className="p-2 sm:p-3 border-b border-[var(--color-border-primary)] min-w-[140px] sm:min-w-[180px] md:min-w-[220px] align-top bg-[var(--color-bg-secondary)]/30 rounded-t-xl">
                  <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
                    <Avatar src={bid.guardPhoto ?? undefined} name={bid.guardName} size="lg" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--color-text-primary)] leading-tight">{bid.guardName}</h4>
                      <div className="mt-0.5 sm:mt-1 flex justify-center scale-90 sm:scale-100">
                        <StarRating rating={bid.guardRating || 0} size="sm" />
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[10px] sm:text-xs divide-y divide-[var(--color-border-primary)]">
            {/* Proposed Rate */}
            <tr className="group">
               <td className="p-2 sm:p-3 font-bold text-[var(--color-text-secondary)] sticky left-0 bg-white dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[var(--color-bg-subtle)] transition-colors">
                 Proposed Rate
               </td>
               {bids.map(bid => (
                 <td key={bid.bidId} className="p-2 sm:p-3 text-[var(--color-text-primary)] font-black text-center text-sm md:text-base group-hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                   £{bid.proposedRate} <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)]">{bid.budgetType === 'HOURLY' ? '/ hr' : '/ fixed'}</span>
                 </td>
               ))}
            </tr>
            {/* Experience */}
            <tr className="group">
               <td className="p-2 sm:p-3 font-bold text-[var(--color-text-secondary)] sticky left-0 bg-white dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[var(--color-bg-subtle)] transition-colors">
                 Experience
               </td>
               {bids.map(bid => (
                 <td key={bid.bidId} className="p-2 sm:p-3 text-[var(--color-text-primary)] font-bold text-center group-hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                   {bid.guardExperience ? `${bid.guardExperience} years` : '0 years'}
                 </td>
               ))}
            </tr>
            {/* License Type */}
            <tr className="group">
               <td className="p-2 sm:p-3 font-bold text-[var(--color-text-secondary)] sticky left-0 bg-white dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[var(--color-bg-subtle)] transition-colors">
                 License Type
               </td>
               {bids.map(bid => (
                 <td key={bid.bidId} className="p-2 sm:p-3 text-center group-hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                   {bid.guardLicenseType ? (
                     <Badge variant="neutral" className="text-[9px] sm:text-[10px] mx-auto font-bold uppercase tracking-wider py-0.5 sm:py-1">
                       <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 text-[var(--color-primary)]" /> {bid.guardLicenseType}
                     </Badge>
                   ) : <span className="text-[var(--color-text-muted)]">-</span>}
                 </td>
               ))}
            </tr>
            {/* Reliability Score */}
            <tr className="group">
               <td className="p-2 sm:p-3 font-bold text-[var(--color-text-secondary)] sticky left-0 bg-white dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[var(--color-bg-subtle)] transition-colors">
                 Reliability
               </td>
               {bids.map(bid => (
                 <td key={bid.bidId} className="p-2 sm:p-3 text-center group-hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                   {bid.guardReliabilityScore !== undefined ? (
                     <span className={`font-black text-xs sm:text-sm px-2 py-0.5 sm:py-1 rounded-lg ${bid.guardReliabilityScore >= 90 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : bid.guardReliabilityScore >= 70 ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'}`}>
                       {bid.guardReliabilityScore}%
                     </span>
                   ) : <span className="text-[var(--color-text-muted)] font-bold">N/A</span>}
                 </td>
               ))}
            </tr>
            {/* Skills Match */}
            <tr className="group">
               <td className="p-2 sm:p-3 font-bold text-[var(--color-text-secondary)] sticky left-0 bg-white dark:bg-slate-950 z-10 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[var(--color-bg-subtle)] transition-colors">
                 Skills Match
               </td>
               {bids.map((bid, i) => {
                 const guardSkills = bid.guardSkills || [];
                 const normalizedGuardSkills = guardSkills.map(s => s.trim().toLowerCase());
                 const required = job.requiredSkills || [];
                 const matchCount = required.filter(s => normalizedGuardSkills.includes(s.trim().toLowerCase())).length;
                 const perc = required.length > 0 ? Math.round((matchCount / required.length) * 100) : 100;

                 return (
                   <td key={bid.bidId} className={`p-2 sm:p-3 align-top bg-gradient-to-b from-transparent to-[var(--color-bg-secondary)]/${i % 2 === 0 ? '10' : '5'} group-hover:to-[var(--color-bg-subtle)]/50 transition-colors`}>
                     <div className="flex justify-center mb-2 sm:mb-3">
                       <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${perc === 100 ? 'bg-[var(--color-success-light)] border-[var(--color-success)]/30 text-[var(--color-success)]' : perc >= 50 ? 'bg-[var(--color-warning-light)] border-[var(--color-warning)]/30 text-[var(--color-warning)]' : 'bg-[var(--color-danger-light)] border-[var(--color-danger)]/30 text-[var(--color-danger)]'}`}>
                         {perc}% Match
                       </span>
                     </div>
                     <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center max-w-[140px] sm:max-w-[180px] mx-auto">
                       {required.length > 0 ? required.map(skill => {
                         const hasSkill = normalizedGuardSkills.includes(skill.trim().toLowerCase());
                         return (
                           <span key={skill} className={`flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border ${hasSkill ? 'bg-[var(--color-success-light)] border-[var(--color-success)]/30 text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] border-[var(--color-danger)]/30 text-[var(--color-danger)]'}`}>
                             {hasSkill ? <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />} {skill}
                           </span>
                         );
                       }) : (
                         <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold italic text-center">No specific skills required</span>
                       )}
                     </div>
                   </td>
                 );
               })}
            </tr>
            {/* Cover Message */}
            <tr className="group">
               <td className="p-2 sm:p-3 font-bold text-[var(--color-text-secondary)] sticky left-0 bg-white dark:bg-slate-950 z-10 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[var(--color-bg-subtle)] transition-colors">
                 Cover Message
               </td>
               {bids.map(bid => (
                 <td key={bid.bidId} className="p-2 sm:p-3 align-top group-hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                   <div className="text-[9px] sm:text-[10px] text-[var(--color-text-secondary)] max-h-32 sm:max-h-40 overflow-y-auto bg-[var(--color-bg-secondary)] p-2 sm:p-3 rounded-lg leading-relaxed border border-[var(--color-border-primary)] shadow-inner custom-scrollbar">
                     {bid.coverMessage}
                   </div>
                 </td>
               ))}
            </tr>
            {/* Actions */}
            <tr>
               <td className="p-2 sm:p-3 sticky left-0 bg-white dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] rounded-bl-xl border-none" />
               {bids.map(bid => (
                 <td key={bid.bidId} className="p-2 sm:p-3 text-center align-top border-none pt-4 sm:pt-6 bg-[var(--color-bg-secondary)]/30 rounded-b-xl">
                   <div className="flex flex-col gap-1.5 sm:gap-2 max-w-[120px] sm:max-w-[160px] mx-auto">
                     <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => { onClose(); onAccept(bid.bidId); }}
                        disabled={isAccepting}
                        className="w-full text-[10px] sm:text-xs bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)] font-bold shadow-md h-8 sm:h-9 px-1"
                     >
                       {isAccepting ? 'Accepting...' : 'Accept Candidate'}
                     </Button>
                     <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { onClose(); onReject(bid.bidId); }}
                        className="w-full text-[9px] sm:text-[10px] font-bold h-7 sm:h-8 opacity-80 hover:opacity-100 px-1"
                     >
                       Reject
                     </Button>
                   </div>
                 </td>
               ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
