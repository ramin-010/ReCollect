# Files Safe to Remove

## ❌ Unused ShadCN Components in `components/ui/`

These files are no longer used in the codebase and can be safely deleted:

### 1. Dialog/Alert Components (Replaced by ui-base/Dialog.tsx)
```
components/ui/alert-dialog.tsx
components/ui/dialog.tsx
```

### 2. Form Components (Replaced by ui-base equivalents)
```
components/ui/button.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/textarea.tsx
```

### 3. Display Components (Replaced by ui-base equivalents)
```
components/ui/badge.tsx
components/ui/card.tsx
```

### 4. Menu Components (Replaced by ui-base/DropdownMenu.tsx)
```
components/ui/dropdown-menu.tsx
```

### 5. Unused Components (Never used in codebase)
```
components/ui/command.tsx
components/ui/popover.tsx
components/ui/scroll-area.tsx
components/ui/separator.tsx
components/ui/tabs.tsx
```

### 6. Toast Hook (Using sonner instead)
```
components/ui/use-toast.ts
```

## ✅ Files to KEEP in `components/ui/`

These are still being used:
```
components/ui/sonner.tsx      ← Toast notifications (as requested)
components/ui/skeleton.tsx    ← Loading states (as requested)
```

## 📋 Complete Removal List

Copy and paste this list to remove all unused files:

```bash
# Navigate to project root
cd E:\PERSONAL_PROJECTS\second_brain\recollect

# Remove unused ShadCN components
rm components/ui/alert-dialog.tsx
rm components/ui/badge.tsx
rm components/ui/button.tsx
rm components/ui/card.tsx
rm components/ui/command.tsx
rm components/ui/dialog.tsx
rm components/ui/dropdown-menu.tsx
rm components/ui/input.tsx
rm components/ui/label.tsx
rm components/ui/popover.tsx
rm components/ui/scroll-area.tsx
rm components/ui/separator.tsx
rm components/ui/tabs.tsx
rm components/ui/textarea.tsx
rm components/ui/use-toast.ts
```

## 🔍 Verification

After removing these files, verify that:

1. ✅ No import errors in the codebase
2. ✅ App runs without errors
3. ✅ All components render correctly
4. ✅ All themes work properly
5. ✅ All dialogs/modals function correctly

## 📊 Space Saved

Removing these 15 files will:
- Clean up the codebase
- Reduce confusion about which components to use
- Eliminate duplicate functionality
- Make the project easier to maintain

## 🎯 Final Component Structure

After removal, your component structure will be:

```
components/
├── ui/                          (ShadCN - minimal)
│   ├── sonner.tsx              ✅ Keep
│   └── skeleton.tsx            ✅ Keep
│
├── ui-base/                     (Custom components)
│   ├── Badge.tsx               ✅ Custom
│   ├── Button.tsx              ✅ Custom
│   ├── Card.tsx                ✅ Custom
│   ├── Dialog.tsx              ✅ Custom (includes AlertDialog)
│   ├── DropdownMenu.tsx        ✅ Custom
│   ├── Input.tsx               ✅ Custom
│   ├── Label.tsx               ✅ Custom
│   ├── Modal.tsx               ✅ Custom
│   └── Textarea.tsx            ✅ Custom
│
├── brand/
│   └── Logo.tsx                ✅ Updated (brain design)
│
├── layout/
│   ├── Navbar.tsx              ✅ Uses ui-base
│   └── Sidebar.tsx             ✅ Uses ui-base
│
├── dashboard/
│   ├── DashboardCard.tsx       ✅ Uses ui-base
│   └── EditDashboardDialog.tsx ✅ Uses ui-base
│
├── content/
│   ├── ContentCard.tsx         ✅ Uses ui-base
│   └── EditContentDialog.tsx   ✅ Uses ui-base
│
└── shared/
    └── DeleteConfirmDialog.tsx ✅ Uses ui-base
```

This is a clean, maintainable structure with clear separation between:
- **ui/** - Minimal ShadCN components (sonner, skeleton)
- **ui-base/** - Custom components used throughout the app
- **Feature components** - All using ui-base components
