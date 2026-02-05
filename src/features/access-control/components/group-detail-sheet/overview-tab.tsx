import { formatDate, getGroupType, GroupTypeConfig, type Group } from "@/features/access-control";

interface OverviewTabProps {
    group: Group;
}

export function OverviewTab({ group }: OverviewTabProps) {
    const groupType = getGroupType(group);
    const typeConfig = GroupTypeConfig[groupType];

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-3">Group Details</h4>
                <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd>{typeConfig?.label}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{formatDate(group.created_at)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Last Updated</dt>
                        <dd>{formatDate(group.updated_at)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">ID</dt>
                        <dd className="font-mono text-xs">
                            {group.id.substring(0, 8)}...
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                    {group.description || "No description provided."}
                </p>
            </div>
        </div>
    );
}
