import { BookOpen, Camera, Headphones, Mail, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

export function HelpCenterContent() {
  const guides = [
    {
      icon: BookOpen,
      title: "Quy trình phỏng vấn chuẩn",
      desc: "Tải lên CV dạng PDF hoặc chọn CV có sẵn, chọn vị trí ứng tuyển, kiểm tra thiết bị và trả lời lần lượt các câu hỏi bằng giọng nói.",
    },
    {
      icon: Headphones,
      title: "Chất lượng âm thanh & STT",
      desc: "Sử dụng tai nghe hoặc micro đặt trong môi trường yên tĩnh để hệ thống Whisper STT nhận diện chính xác câu trả lời của bạn.",
    },
    {
      icon: Camera,
      title: "Giám sát hướng nhìn (MediaPipe)",
      desc: "Đặt camera ngang tầm mắt và đủ sáng. Xử lý khuôn mặt chạy trực tiếp trên trình duyệt và chỉ chụp bằng chứng khi nhìn lệch hướng kéo dài.",
    },
    {
      icon: ShieldCheck,
      title: "Bảo mật & Quyền riêng tư",
      desc: "Hồ sơ cá nhân, lịch sử câu trả lời và kết quả chấm điểm được lưu trữ an toàn gắn liền với tài khoản của bạn.",
    },
  ];

  const faqs = [
    {
      q: "Độ phù hợp công việc (% phù hợp CV) được tính như thế nào?",
      a: "Hệ thống đối chiếu trực tiếp danh sách kỹ năng được bóc tách từ CV đã quét với kỹ năng yêu cầu của từng vị trí trong kho việc làm.",
    },
    {
      q: "Điểm tổng kết 100 điểm dựa trên tiêu chí nào?",
      a: "Mỗi câu trả lời được đánh giá theo 7 tiêu chí chuyên sâu (độ liên quan, chính xác kỹ thuật, độ phủ tín hiệu, tư duy lập luận, bằng chứng thực tế, độ rõ ràng và tính nhất quán), sau đó tổng hợp thành 5 nhóm năng lực cốt lõi.",
    },
    {
      q: "Tôi có thể chỉnh sửa thông tin cá nhân không?",
      a: "Có. Bạn có thể vào mục Hồ sơ cá nhân hoặc Cài đặt trên thanh điều hướng để cập nhật họ tên, email, số điện thoại và lưu trực tiếp vào hệ thống.",
    },
  ];

  return (
    <>
      <PageHeader
        title="Trung tâm hỗ trợ"
        description="Hướng dẫn sử dụng PrepHire AI và giải đáp các câu hỏi thường gặp."
      />

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <Card
                key={g.title}
                className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="m-0 text-[15px] font-semibold text-zinc-950">
                    {g.title}
                  </h3>
                  <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                    {g.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </section>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="m-0 mb-4 text-[16px] font-semibold text-zinc-950">
            Câu hỏi thường gặp
          </h2>
          <div className="divide-y divide-zinc-100">
            {faqs.map((item) => (
              <div key={item.q} className="py-4 first:pt-0 last:pb-0">
                <div className="text-[14px] font-semibold text-zinc-900">
                  {item.q}
                </div>
                <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-zinc-950">
                Cần hỗ trợ kỹ thuật trực tiếp?
              </div>
              <div className="text-[13px] text-zinc-500">
                Liên hệ đội ngũ kỹ thuật PrepHire AI qua{" "}
                <span className="font-medium text-zinc-800">
                  support@prephire.vn
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

