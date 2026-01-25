import { format, isToday, isTomorrow, addDays } from 'date-fns';

export const getRelativeDateDisplay = (date: Date) => {
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
  if (date < addDays(new Date(), 7)) return format(date, 'EEEE h:mm a'); 
  
  if (date.getFullYear() !== new Date().getFullYear()) {
    return format(date, 'MMM d yyyy, h:mm a'); 
  }
  
  return format(date, 'MMM d, h:mm a'); 
};

export const getHighlightedContent = (
  title: string,
  parsedResult: any,
  confirmedDueDate: Date | null,
  selectedLabels: any[]
) => {
  if (!title) return null;

  const highlightSegments: { text: string; type: 'date' | 'tag' }[] = [];

  if (parsedResult?.matchedSegments?.length && !confirmedDueDate) {
    parsedResult.matchedSegments.forEach((segment: string) => {
      highlightSegments.push({ text: segment, type: 'date' });
    });
  }

  const tagMatches = title.match(/@\w+/g);
  if (tagMatches) {
    tagMatches.forEach((tag) => {
      highlightSegments.push({ text: tag, type: 'tag' });
    });
  }

  if (highlightSegments.length === 0) return null;

  const uniqueTexts = Array.from(new Set(highlightSegments.map(s => s.text))).sort((a, b) => b.length - a.length);

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${uniqueTexts.map(escapeRegExp).join('|')})`, 'gi');
  
  const splitParts = title.split(pattern);

  return (
    <div 
      className="absolute inset-0 flex items-center font-medium pointer-events-none overflow-hidden whitespace-pre"
      aria-hidden="true"
    >
      {splitParts.map((part, i) => {
        const segment = highlightSegments.find(s => s.text.toLowerCase() === part.toLowerCase());
        if (segment?.type === 'tag') {
          return <span key={i} className="bg-blue-500/20 text-blue-300 rounded-sm">{part}</span>;
        } else if (segment?.type === 'date') {
          return <span key={i} className="bg-indigo-500/20 text-white rounded-sm">{part}</span>;
        }
        return <span key={i} className="text-white">{part}</span>;
      })}
    </div>
  );
};