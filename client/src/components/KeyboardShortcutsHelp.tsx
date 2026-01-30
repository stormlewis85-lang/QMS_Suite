import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: '⌘/Ctrl + K', description: 'Open quick search' },
  { keys: '⌘/Ctrl + S', description: 'Save current changes' },
  { keys: '⌘/Ctrl + E', description: 'Toggle edit mode' },
  { keys: '⌘/Ctrl + P', description: 'Export as PDF' },
  { keys: '⌘/Ctrl + Shift + P', description: 'Export as Excel' },
  { keys: 'Escape', description: 'Close dialog / Cancel edit' },
  { keys: '↑ / ↓', description: 'Navigate table rows' },
  { keys: 'Enter', description: 'Open selected item' },
  { keys: '?', description: 'Show keyboard shortcuts' },
];

export function KeyboardShortcutsHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-keyboard-shortcuts">
          <Keyboard className="h-4 w-4" />
          <span className="hidden md:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
