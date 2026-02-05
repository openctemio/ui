import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Shield,
    Plus,
    Trash2,
    MoreHorizontal,
    Search,
    ChevronRight,
} from "lucide-react";
import { type PermissionSet } from "@/features/access-control";
import { useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PermissionsTabProps {
    permissionSets: PermissionSet[];
    isLoading: boolean;
    onAddPermissionSet: () => void;
    onRemovePermissionSet: (id: string, name: string) => void;
}

export function PermissionsTab({
    permissionSets,
    isLoading,
    onAddPermissionSet,
    onRemovePermissionSet,
}: PermissionsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPermissionSets = permissionSets.filter((ps) => {
        const name = ps.name || "";
        const description = ps.description || "";
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">
                    Permission Sets ({permissionSets.length})
                </h4>
                <Button size="sm" onClick={onAddPermissionSet}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Permission Set
                </Button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search permission sets..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : permissionSets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No permission sets assigned</p>
                </div>
            ) : filteredPermissionSets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No permission sets found matching &quot;{searchQuery}&quot;</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredPermissionSets.map((ps) => {
                        const name = ps.name || "Unknown Permission Set";
                        const description = ps.description;
                        const isSystem = ps.is_system;
                        const key = ps.id;

                        // Normalize permissions to string array
                        const permissionsList = Array.isArray(ps.permissions)
                            ? ps.permissions
                            : typeof ps.permissions === 'object' && ps.permissions !== null
                                ? Object.keys(ps.permissions)
                                : [];

                        return (
                            <Collapsible key={key}>
                                <div className="rounded-lg border hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted">
                                                    <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
                                                </Button>
                                            </CollapsibleTrigger>
                                            <div
                                                className={`p-2 rounded-lg ${isSystem ? "bg-purple-500/20" : "bg-blue-500/20"
                                                    }`}
                                            >
                                                <Shield
                                                    className={`h-4 w-4 ${isSystem ? "text-purple-500" : "text-blue-500"
                                                        }`}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm">{name}</p>
                                                    {isSystem && (
                                                        <Badge variant="outline" className="text-xs">
                                                            System
                                                        </Badge>
                                                    )}
                                                </div>
                                                {description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {permissionsList.length} permissions
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-red-400"
                                                        onClick={() => onRemovePermissionSet(ps.id, name)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <CollapsibleContent>
                                        <div className="px-4 pb-3 pl-[3.25rem]">
                                            <div className="text-xs text-muted-foreground mb-2 font-medium">Included Permissions:</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {permissionsList.slice(0, 20).map((perm: string) => (
                                                    <div key={perm} className="flex items-center gap-2 text-xs bg-muted/50 p-1.5 rounded">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                        <span className="font-mono">{perm}</span>
                                                    </div>
                                                ))}
                                                {permissionsList.length > 20 && (
                                                    <div className="text-xs text-muted-foreground italic p-1.5">
                                                        + {permissionsList.length - 20} more...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
