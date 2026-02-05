import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface ErrorDisplayProps {
    error: { status?: number; response?: { status?: number } } | null;
    onClose: () => void;
    onRetry: () => void;
}

export function ErrorDisplay({ error: errorDetails, onClose, onRetry }: ErrorDisplayProps) {
    const status = errorDetails?.status || errorDetails?.response?.status;

    const getErrorTitle = () => {
        if (status === 404) return "Group không tồn tại";
        if (status === 403) return "Không có quyền truy cập";
        if (status && status >= 500) return "Lỗi máy chủ";
        return "Không thể tải thông tin group";
    };

    const getErrorDescription = () => {
        if (status === 404) return "Group này có thể đã bị xóa hoặc không tồn tại trong hệ thống.";
        if (status === 403) return "Bạn không có quyền xem thông tin chi tiết của group này.";
        if (status && status >= 500) return "Đã xảy ra lỗi từ phía máy chủ. Vui lòng thử lại sau.";
        return "Không thể tải thông tin group. Vui lòng kiểm tra kết nối và thử lại.";
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
                <Shield className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">{getErrorTitle()}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    {getErrorDescription()}
                </p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                    Đóng
                </Button>
                <Button onClick={onRetry}>
                    Thử lại
                </Button>
            </div>
        </div>
    );
}
