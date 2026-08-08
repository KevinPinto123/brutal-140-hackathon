import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { PresencePanel } from "./PresencePanel";
import { QuickViews } from "./QuickViews";

export function BottomBar() {
  return (
    <div className="grid h-[198px] shrink-0 grid-cols-[minmax(0,332fr)_minmax(0,556fr)_minmax(0,220fr)_minmax(0,346fr)] gap-3 px-4 pb-4">
      <ChatPanel />
      <QuickViews />
      <ParticipantsPanel />
      <PresencePanel />
    </div>
  );
}
