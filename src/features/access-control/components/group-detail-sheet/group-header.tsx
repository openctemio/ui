import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    Users,
    Pencil,
    X,
    Save,
    Loader2,
} from "lucide-react";
import {
    type Group,
    getGroupType,
    GroupTypeConfig,
} from "@/features/access-control";

interface GroupHeaderProps {
    group: Group;
    isEditing: boolean;
    editForm: { name: string; description: string };
    isUpdating: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSave: () => void;
    onEditFormChange: (data: { name: string; description: string }) => void;
}

export function GroupHeader({
    group,
    isEditing,
    editForm,
    isUpdating,
    onStartEdit,
    onCancelEdit,
    onSave,
    onEditFormChange,
}: GroupHeaderProps) {
    const groupType = getGroupType(group);
    const typeConfig = GroupTypeConfig[groupType];

    return (
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-muted/50 to-background">
            {/* Edit Button */}
            <div className="absolute top-4 right-4">
                {isEditing ? (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onCancelEdit}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={onSave}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                ) : (
                    <Button size="sm" variant="ghost" onClick={onStartEdit}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Team Icon & Info */}
            <div className="flex flex-col items-center text-center">
                <div className={`p-4 rounded-xl ${typeConfig?.bgColor}`}>
                    {groupType === "security_team" ? (
                        <ShieldCheck className={`h-8 w-8 ${typeConfig?.color}`} />
                    ) : (
                        <Users className={`h-8 w-8 ${typeConfig?.color}`} />
                    )}
                </div>

                {isEditing ? (
                    <Input
                        value={editForm.name}
                        onChange={(e) =>
                            onEditFormChange({ ...editForm, name: e.target.value })
                        }
                        className="mt-4 text-center font-semibold"
                        placeholder="Group Name"
                    />
                ) : (
                    <h2 className="mt-4 text-xl font-semibold">{group.name}</h2>
                )}

                {isEditing ? (
                    <Textarea
                        value={editForm.description}
                        onChange={(e) =>
                            onEditFormChange({ ...editForm, description: e.target.value })
                        }
                        placeholder="Add a description..."
                        className="mt-2 text-center"
                        rows={2}
                    />
                ) : group.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {group.description}
                    </p>
                ) : null}

                <Badge
                    className={`mt-3 ${typeConfig?.bgColor} ${typeConfig?.color} border-0`}
                >
                    {typeConfig?.label}
                </Badge>
            </div>
        </div>
    );
}
