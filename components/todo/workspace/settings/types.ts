export interface WorkspaceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkspace: any;
  currentUser: any;
  isAdmin: boolean;
  isInviting: boolean;
  setIsInviting: (val: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  isInviteLoading: boolean;
  handleInvite: () => void;
  handleRemoveMember: (id: string) => void;
  onDeleteWorkspace?: () => void;
}

export type SettingsTabType = 'members' | 'roles' | 'customization' | 'danger';

export interface TabConfig {
  id: SettingsTabType;
  label: string;
  icon: any;
  isDestructive?: boolean;
}
