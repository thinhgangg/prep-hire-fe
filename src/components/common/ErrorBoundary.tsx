import React from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("PrepHire UI ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-6">
        <Card className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="m-0 text-lg font-bold text-zinc-950">
            Đã xảy ra lỗi hiển thị
          </h1>
          <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-500">
            Một thành phần giao diện gặp sự cố ngoài dự kiến. Dữ liệu phiên phỏng
            vấn của bạn vẫn được lưu an toàn trên máy chủ.
          </p>
          {this.state.error?.message && (
            <pre className="mt-4 max-h-28 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left text-xs text-red-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              <RotateCcw className="h-4 w-4" /> Thử lại
            </Button>
            <Button onClick={() => (window.location.href = "/")}>
              <Home className="h-4 w-4" /> Về trang chính
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}

