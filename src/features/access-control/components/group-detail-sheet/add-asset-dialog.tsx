import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    type AssetOwnershipType,
    type GroupAsset,
} from "@/features/access-control";
import { useAssets } from "@/features/assets/hooks/use-assets";
import { useState, useEffect } from "react";

interface AddAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isAssigning: boolean;
    onAssign: (assetId: string, ownershipType: AssetOwnershipType) => Promise<void>;
    existingAssets: GroupAsset[];
}

export function AddAssetDialog({
    open,
    onOpenChange,
    isAssigning,
    onAssign,
    existingAssets,
}: AddAssetDialogProps) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Custom debounce implementation
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [ownershipType, setOwnershipType] = useState<AssetOwnershipType>("secondary");

    // Only fetch assets when dialog is open (avoid unnecessary API calls)
    const { assets, isLoading } = useAssets({
        search: debouncedSearch,
        pageSize: 20,
        statuses: ["active"],
        skip: !open,
    });

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setSearch("");
            setSelectedAssetId("");
            setOwnershipType("secondary");
        }
    }, [open]);

    const handleAssign = async () => {
        if (!selectedAssetId) return;
        await onAssign(selectedAssetId, ownershipType);
    };

    const isAssetAssigned = (assetId: string) => {
        return existingAssets.some((ga) => ga.asset_id === assetId);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Asset</DialogTitle>
                    <DialogDescription>
                        Assign an asset to this team to grant access or ownership.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Asset Selection */}
                    <div className="space-y-2">
                        <Label>Select Asset</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search for assets..."
                                className="pl-9 mb-2"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="border rounded-md max-h-[200px] overflow-y-auto p-1 space-y-1">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                                    Loading assets...
                                </div>
                            ) : assets.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    No assets found
                                </div>
                            ) : (
                                assets.map((asset) => {
                                    const assigned = isAssetAssigned(asset.id);
                                    const selected = selectedAssetId === asset.id;

                                    return (
                                        <div
                                            key={asset.id}
                                            className={`
                        flex items-center justify-between p-2 rounded-sm cursor-pointer text-sm
                        ${assigned ? "opacity-50 cursor-not-allowed bg-muted/50" : "hover:bg-muted"}
                        ${selected ? "bg-primary/10 border-primary/20 border" : ""}
                      `}
                                            onClick={() => !assigned && setSelectedAssetId(asset.id)}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <div className="flex flex-col truncate">
                                                    <span className="font-medium truncate">{asset.name}</span>
                                                    <span className="text-xs text-muted-foreground capitalize">{asset.type}</span>
                                                </div>
                                            </div>
                                            {assigned && (
                                                <Badge variant="secondary" className="text-[10px] h-5">Assigned</Badge>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {selectedAssetId && (
                            <p className="text-xs text-muted-foreground text-right">
                                1 asset selected
                            </p>
                        )}
                    </div>

                    {/* Ownership Type */}
                    <div className="space-y-2">
                        <Label>Ownership Type</Label>
                        <Select
                            value={ownershipType}
                            onValueChange={(value: AssetOwnershipType) => setOwnershipType(value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="primary">
                                    <div className="flex flex-col">
                                        <span className="font-medium">Primary</span>
                                        <span className="text-xs text-muted-foreground">Main owner with full access and responsibility</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="secondary">
                                    <div className="flex flex-col">
                                        <span className="font-medium">Secondary</span>
                                        <span className="text-xs text-muted-foreground">Co-owner with full access and shared responsibility</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="stakeholder">
                                    <div className="flex flex-col">
                                        <span className="font-medium">Stakeholder</span>
                                        <span className="text-xs text-muted-foreground">View access, receives critical notifications</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="informed">
                                    <div className="flex flex-col">
                                        <span className="font-medium">Informed</span>
                                        <span className="text-xs text-muted-foreground">No direct access, receives summary notifications</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={isAssigning || !selectedAssetId}
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
