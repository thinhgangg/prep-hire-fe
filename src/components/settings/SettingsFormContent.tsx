import { useEffect, useState } from "react";
import { Check, KeyRound, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NOTIFICATION_ITEMS = [
  {
    key: "ai_score_ready",
    title: "Kết quả chấm điểm AI hoàn tất",
    desc: "Thông báo ngay khi hệ thống hoàn tất phân tích phiên phỏng vấn.",
    defaultValue: true,
  },
  {
    key: "interview_reminder",
    title: "Nhắc lịch luyện tập phỏng vấn",
    desc: "Nhận nhắc nhở định kỳ để duy trì tiến độ ôn luyện.",
    defaultValue: true,
  },
  {
    key: "job_match",
    title: "Gợi ý vị trí tuyển dụng mới",
    desc: "Cập nhật khi có tin tuyển dụng phù hợp với kỹ năng trên CV.",
    defaultValue: false,
  },
  {
    key: "security_alert",
    title: "Cảnh báo bảo mật tài khoản",
    desc: "Thông báo khi có thay đổi hồ sơ hoặc đăng nhập từ thiết bị mới.",
    defaultValue: true,
  },
];

export function SettingsFormContent({
  roleLabel = "Quản trị viên",
}: {
  roleLabel?: string;
}) {
  const { user, updateProfile, changePassword } = useAuth();
  const [tab, setTab] = useState("Hồ sơ");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentRole, setCurrentRole] = useState(user?.current_role || "");
  const [location, setLocation] = useState(user?.location || "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const prefsStorageKey = `prephire_notif_prefs_${user?.username || "default"}`;
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    NOTIFICATION_ITEMS.forEach((item) => {
      defaults[item.key] = item.defaultValue;
    });
    try {
      const saved = localStorage.getItem(prefsStorageKey);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCurrentRole(user.current_role || "");
      setLocation(user.location || "");
    }
  }, [user]);

  const initials =
    (name || user?.name || "UV")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(-2)
      .join("")
      .toUpperCase() || "UV";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        current_role: currentRole.trim(),
        location: location.trim(),
      });
      setSuccessMsg("Cập nhật hồ sơ thành công.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    if (newPw.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPw !== confirmPw) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setSuccessMsg("Đổi mật khẩu thành công.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể đổi mật khẩu.");
    } finally {
      setChangingPw(false);
    }
  };

  const handleTogglePref = (key: string, next: boolean) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: next };
      try {
        localStorage.setItem(prefsStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSavePrefs = () => {
    try {
      localStorage.setItem(prefsStorageKey, JSON.stringify(notifPrefs));
    } catch {}
    setSuccessMsg("Đã lưu tùy chọn thông báo.");
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Quản lý thông tin tài khoản và tùy chỉnh không gian làm việc."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="h-fit rounded-2xl border border-zinc-200 bg-white p-3 lg:col-span-3">
          <div className="flex flex-col gap-1">
            {["Hồ sơ", "Thông báo", "Bảo mật"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setSuccessMsg("");
                  setErrorMsg("");
                }}
                className={
                  tab === t
                    ? "flex h-10 w-full items-center rounded-lg border-0 bg-zinc-100 px-3 text-left text-sm font-semibold text-zinc-950 cursor-pointer"
                    : "flex h-10 w-full items-center rounded-lg border-0 bg-transparent px-3 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer"
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-9">
          <div className="border-b border-zinc-100 pb-4">
            <h2 className="m-0 text-lg font-semibold text-zinc-950">{tab}</h2>
            <p className="m-0 mt-1 text-sm text-zinc-500">
              Cập nhật thông tin và thiết lập {tab.toLowerCase()} của bạn.
            </p>
          </div>

          {successMsg && (
            <Alert variant="success" className="mt-4">
              <Check className="h-4 w-4" />
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}
          {errorMsg && (
            <Alert variant="destructive" className="mt-4">
              <X className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {tab === "Hồ sơ" ? (
            <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-zinc-900 text-base font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-zinc-950">
                    {name || user?.name || roleLabel}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {email || user?.email || ""}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-name">Họ và tên</Label>
                  <Input
                    id="set-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-email">Email</Label>
                  <Input
                    id="set-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@prephire.vn"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-phone">Số điện thoại</Label>
                  <Input
                    id="set-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+84 912 345 678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-role">Vị trí mong muốn</Label>
                  <Input
                    id="set-role"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    placeholder={
                      roleLabel === "Quản trị viên"
                        ? "VD: Quản trị viên tuyển dụng"
                        : "VD: Frontend Developer"
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="set-location">Khu vực / Địa chỉ</Label>
                  <Input
                    id="set-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: TP. Hồ Chí Minh, Việt Nam"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-zinc-100 pt-5">
                <Button type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          ) : tab === "Thông báo" ? (
            <div className="mt-5">
              <div className="divide-y divide-zinc-100">
                {NOTIFICATION_ITEMS.map((item) => {
                  const checked = Boolean(notifPrefs[item.key]);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0 pr-2">
                        <label
                          htmlFor={`notif-${item.key}`}
                          className="block cursor-pointer text-sm font-medium text-zinc-900"
                        >
                          {item.title}
                        </label>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {item.desc}
                        </div>
                      </div>
                      <Switch
                        id={`notif-${item.key}`}
                        aria-label={item.title}
                        checked={checked}
                        onCheckedChange={(next) =>
                          handleTogglePref(item.key, next)
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end border-t border-zinc-100 pt-5">
                <Button type="button" onClick={handleSavePrefs}>
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-4">
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    Trạng thái xác thực JWT
                  </div>
                  <div className="text-xs text-zinc-500">
                    Đang đăng nhập bằng vai trò{" "}
                    <b className="text-zinc-800">{roleLabel}</b>
                  </div>
                </div>
                <Badge variant="success" className="rounded-full">
                  Đang hoạt động
                </Badge>
              </div>

              <form
                onSubmit={handleChangePassword}
                className="space-y-4 rounded-xl border border-zinc-200 p-5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <KeyRound className="h-4 w-4 text-emerald-600" />
                  Đổi mật khẩu đăng nhập
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="pw-current">Mật khẩu hiện tại</Label>
                    <Input
                      id="pw-current"
                      type="password"
                      required
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-new">Mật khẩu mới</Label>
                    <Input
                      id="pw-new"
                      type="password"
                      required
                      minLength={6}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-confirm">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="pw-confirm"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={changingPw}>
                    {changingPw ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
