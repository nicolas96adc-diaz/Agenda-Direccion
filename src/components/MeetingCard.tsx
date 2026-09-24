import React from 'react';
import { CalendarDays, Check, Clock, MapPin, Users } from 'lucide-react';
import { MeetingAttendance, Task, UserProfile } from '../types';
import { formatMeetingDateTime } from '../utils/dateUtils';

interface MeetingCardProps {
  meeting: Task;
  attendance: MeetingAttendance[];
  currentUser: UserProfile;
  onOpen: (task: Task) => void;
  onToggleAttendance: (meetingId: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, attendance, currentUser, onOpen, onToggleAttendance }) => {
  const isOrganizer = !!currentUser.uid && meeting.organizerUid === currentUser.uid;
  const isAttending = !!currentUser.uid && attendance.some(item => item.attendeeUid === currentUser.uid);
  const meetingDateTime = formatMeetingDateTime(meeting.dueDate, meeting.dueTime);
  const attendeeNames = attendance.map(item => item.attendeeName);

  return (
    <article className="rounded-2xl border border-indigo-200 bg-indigo-50/55 p-4 sm:p-5 shadow-[0_3px_14px_rgba(79,70,229,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onOpen(meeting)} className="min-w-0 flex-1 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-800">
            <CalendarDays className="w-3.5 h-3.5" /> Reunión de grupo
          </span>
          <h3 className="mt-2 text-base sm:text-lg font-bold leading-snug text-slate-900">{meeting.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-600" /> {meetingDateTime}</span>
            {meeting.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-600" /> {meeting.location}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-600">Organiza: <strong className="font-semibold text-slate-800">{meeting.organizerName || meeting.createdBy}</strong></p>
          {meeting.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{meeting.description}</p>}
        </button>
        {!isOrganizer && (
          <button type="button" onClick={() => onToggleAttendance(meeting.id)} className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold transition-colors ${isAttending ? 'border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-100' : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}>
            {isAttending ? 'Cancelar asistencia' : 'Asistiré'}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-indigo-200/80 pt-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex -space-x-1.5" aria-hidden="true">
            {attendance.slice(0, 4).map(item => <span key={item.id} className="grid h-6 w-6 place-items-center rounded-full border-2 border-indigo-50 bg-indigo-700 text-[9px] font-bold text-white">{item.attendeeName.split(' ').slice(0, 2).map(part => part[0]).join('')}</span>)}
            {attendance.length === 0 && <Users className="w-5 h-5 text-indigo-500" />}
          </div>
          <div className="min-w-0 text-xs leading-relaxed text-indigo-950">
            <strong className="font-bold">Confirmados ({attendance.length})</strong>
            {attendeeNames.length ? <><span aria-hidden="true">: </span>{attendeeNames.join(', ')}</> : null}
            {isOrganizer && <span className="ml-1 text-indigo-700">· Sos el organizador</span>}
          </div>
        </div>
      </div>
    </article>
  );
};

