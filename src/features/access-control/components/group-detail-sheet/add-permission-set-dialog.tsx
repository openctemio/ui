import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Check, ChevronsUpDown } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type PermissionSet } from "@/features/access-control";

interface AddPermissionSetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newPermissionSetId: string;
    setNewPermissionSetId: (id: string) => void;
    isAssigning: boolean;
    onAssign: () => void;
    availablePermissionSets: PermissionSet[];
}

export function AddPermissionSetDialog({
    open,
    onOpenChange,
    newPermissionSetId,
    setNewPermissionSetId,
    isAssigning,
    onAssign,
    availablePermissionSets,
}: AddPermissionSetDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Permission Set</DialogTitle>
                    <DialogDescription>
                        Assign a permission set to this group. All members will inherit these permissions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Permission Set</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        "w-full justify-between font-normal",
                                        !newPermissionSetId && "text-muted-foreground"
                                    )}
                                >
                                    {newPermissionSetId
                                        ? availablePermissionSets.find(
                                            (ps) => ps.id === newPermissionSetId
                                        )?.name
                                        : "Select a permission set..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search permission sets..." />
                                    <CommandList>
                                        <CommandEmpty>No permission set found.</CommandEmpty>
                                        <CommandGroup>
                                            {availablePermissionSets.map((ps) => (
                                                <CommandItem
                                                    key={ps.id}
                                                    value={ps.name}
                                                    onSelect={() => {
                                                        setNewPermissionSetId(ps.id);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            newPermissionSetId === ps.id
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span>{ps.name}</span>
                                                            {ps.is_system && (
                                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                                    System
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {ps.description && (
                                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                                {ps.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onAssign}
                        disabled={isAssigning || !newPermissionSetId}
                    >
                        {isAssigning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
