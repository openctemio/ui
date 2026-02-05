import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Users,
    UserPlus,
    Trash2,
    MoreHorizontal,
    Crown,
    User,
    Search,
} from "lucide-react";
import {
    MemberRoleConfig,
    getInitials,
    type GroupMember,
} from "@/features/access-control";
import { useState } from "react";

interface MembersTabProps {
    members: GroupMember[];
    isLoading: boolean;
    onAddMember: () => void;
    onRemoveMember: (userId: string, name: string) => void;
}

export function MembersTab({
    members,
    isLoading,
    onAddMember,
    onRemoveMember,
}: MembersTabProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredMembers = members.filter((member) => {
        const name = member.name || member.user_name || member.user?.name || "";
        const email = member.email || member.user_email || member.user?.email || "";
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Group Members ({members.length})</h4>
                <Button size="sm" onClick={onAddMember}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                </Button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search members..."
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
            ) : members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members in this group yet</p>
                </div>
            ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No members found matching &quot;{searchQuery}&quot;</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredMembers.map((member, index) => {
                        const roleConfig = MemberRoleConfig[member.role] || MemberRoleConfig.member;
                        const name = member.name || member.user_name || member.user?.name || "Unknown Member";
                        const email = member.email || member.user_email || member.user?.email || "";
                        const key = member.id || member.user_id || member.user?.id || `member-${index}`;
                        const initials = getInitials(name);

                        return (
                            <div
                                key={key}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="text-xs">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">{name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {email}
                                            {member.added_by && (
                                                <span className="ml-1 text-xs text-muted-foreground/60">
                                                    • Added by {member.added_by}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        className={`${roleConfig.bgColor} ${roleConfig.color} border-0 text-xs`}
                                    >
                                        {member.role === "owner" && (
                                            <Crown className="h-3 w-3 mr-1" />
                                        )}
                                        {member.role === "lead" && (
                                            <Crown className="h-3 w-3 mr-1" />
                                        )}
                                        {member.role === "member" && (
                                            <User className="h-3 w-3 mr-1" />
                                        )}
                                        {roleConfig.label}
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
                                                onClick={() =>
                                                    onRemoveMember(member.user_id || member.user?.id || "", name)
                                                }
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
