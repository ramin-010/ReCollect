import { Doc } from '@/lib/store/docStore';
import { ServerDoc } from '@/lib/api/docApi';

export interface DocEditorProps {
  doc: Doc;
  onBack: () => void;
}

export interface ConflictData {
  localUpdatedAt: number;
  serverUpdatedAt: number;
  serverDoc: ServerDoc;
}

export interface ToolbarPosition {
  top: number;
  left: number;
}
