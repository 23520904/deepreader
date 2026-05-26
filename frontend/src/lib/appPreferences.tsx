"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AppLocale = "en" | "vi";

type AppPreferencesContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
  t: (text: string) => string;
};

const LOCALE_STORAGE_KEY = "deepreader.locale";

const VI_TRANSLATIONS: Record<string, string> = {
  Home: "Trang chủ",
  About: "Giới thiệu",
  Library: "Thư viện",
  Flashcards: "Thẻ ghi nhớ",
  Contact: "Liên hệ",
  Admin: "Quản trị",
  Login: "Đăng nhập",
  "Log out": "Đăng xuất",
  "LOG OUT": "ĐĂNG XUẤT",
  Profile: "Hồ sơ",
  PROFILE: "HỒ SƠ",
  LIBRARY: "THƯ VIỆN",
  FLASHCARDS: "THẺ GHI NHỚ",
  "HELP CENTER": "TRUNG TÂM HỖ TRỢ",
  "Help Center": "Trung tâm hỗ trợ",
  "Configure AI": "Cấu hình AI",
  "CONFIGURE AI": "CẤU HÌNH AI",
  Language: "Ngôn ngữ",
  Preferences: "Tùy chọn",
  Workspace: "Không gian làm việc",
  English: "Tiếng Anh",
  Vietnamese: "Tiếng Việt",
  "Switch language": "Đổi ngôn ngữ",
  "Account sidebar": "Thanh tài khoản",
  "Close account sidebar": "Đóng thanh tài khoản",
  "Open account sidebar": "Mở thanh tài khoản",
  "Toggle mobile menu": "Bật/tắt menu di động",
  "DeepReader Home": "Trang chủ DeepReader",

  "AI Configuration": "Cấu hình AI",
  "Your personal API key": "API key cá nhân của bạn",
  "Personal API Key": "API key cá nhân",
  "Your API key is stored securely on the server and takes priority over the default key. Groq is tried first, Gemini is the fallback.":
    "API key của bạn được lưu an toàn trên server và được ưu tiên hơn key mặc định. Groq sẽ được thử trước, Gemini là phương án dự phòng.",
  "Embeddings always use Gemini (server key).":
    "Embedding luôn dùng Gemini bằng key của server.",
  "LLM Provider": "Nhà cung cấp LLM",
  "Get key ->": "Lấy key ->",
  "Save key": "Lưu key",
  "Saving...": "Đang lưu...",
  Cancel: "Hủy",
  Close: "Đóng",
  "Close AI settings": "Đóng cài đặt AI",
  "API key saved successfully! Your AI features will use your key.":
    "API key đã lưu thành công! Các tính năng AI sẽ dùng key của bạn.",
  "API key is required.": "Vui lòng nhập API key.",
  'Groq API key must start with "gsk_".':
    'Groq API key phải bắt đầu bằng "gsk_".',
  'Gemini API key must not start with "gsk_". If this is a Groq key, choose Groq.':
    'Gemini API key không được bắt đầu bằng "gsk_". Nếu đây là Groq key, hãy chọn Groq.',
  "This API key looks too short. Please check it again.":
    "API key có vẻ quá ngắn, vui lòng kiểm tra lại.",
  "Could not save API key.": "Không thể lưu API key.",
  "Save failed.": "Lưu thất bại.",
  Clear: "Xóa",
  "Hide key": "Ẩn key",
  "Show key": "Hiện key",
  "Key starts with gsk_ - create one at console.groq.com":
    "Key bắt đầu bằng gsk_ - tạo tại console.groq.com",
  "Key does not start with gsk_ - create one at aistudio.google.com":
    "Key không bắt đầu bằng gsk_ - tạo tại aistudio.google.com",
  "Llama 3.1 8B Instant (default)": "Llama 3.1 8B Instant (mặc định)",
  "Gemini 2.0 Flash (default)": "Gemini 2.0 Flash (mặc định)",

  "Welcome Back!": "Chào mừng trở lại!",
  "Log in to continue learning with DeepReader AI.":
    "Đăng nhập để tiếp tục học cùng DeepReader AI.",
  Email: "Email",
  Password: "Mật khẩu",
  "Logging in...": "Đang đăng nhập...",
  "Not a member?": "Chưa có tài khoản?",
  "Register now": "Đăng ký ngay",
  "Create an account": "Tạo tài khoản",
  "Join DeepReader to read, summarize and learn with AI.":
    "Tham gia DeepReader để đọc, tóm tắt và học với AI.",
  "User Name": "Tên người dùng",
  "Confirm Password": "Xác nhận mật khẩu",
  "Create Account": "Tạo tài khoản",
  "Already have an account?": "Đã có tài khoản?",
  "Login now": "Đăng nhập ngay",
  "Verify sign up": "Xác minh đăng ký",
  "Enter the 4-digit code to finish creating your account.":
    "Nhập mã 4 chữ số để hoàn tất tạo tài khoản.",
  "Verification code": "Mã xác minh",
  "Verification code image": "Ảnh mã xác minh",
  Creating: "Đang tạo",
  "Creating...": "Đang tạo...",
  Confirm: "Xác nhận",
  "Please enter a user name.": "Vui lòng nhập tên người dùng.",
  "Confirm password does not match.": "Mật khẩu xác nhận không khớp.",
  "Please submit the form again.": "Vui lòng gửi lại biểu mẫu.",
  "Please enter 4 digits.": "Vui lòng nhập 4 chữ số.",
  "Verification code is not correct.": "Mã xác minh không đúng.",
  "Sign up failed.": "Đăng ký thất bại.",
  "Login failed.": "Đăng nhập thất bại.",
  "Read smarter and learn faster with DeepReader AI":
    "Đọc thông minh hơn và học nhanh hơn với DeepReader AI",
  "AI Summary. Smart Flashcards. Book Chat Assistant.":
    "Tóm tắt AI. Thẻ ghi nhớ thông minh. Trợ lý chat sách.",

  "Read Faster": "Đọc nhanh hơn",
  "with AI": "với AI",
  "Upload your documents and let DeepReader turn long PDFs, notes, and study materials into clear summaries, smart flashcards, and source-based answers.":
    "Tải tài liệu lên và để DeepReader biến PDF, ghi chú, tài liệu học dài thành tóm tắt rõ ràng, flashcard thông minh và câu trả lời bám sát nguồn.",
  "Get Started": "Bắt đầu",
  "Upload Document": "Tải tài liệu lên",
  "Add PDFs, EPUBs, notes, or learning files to your private library.":
    "Thêm PDF, EPUB, ghi chú hoặc tài liệu học vào thư viện riêng của bạn.",
  "AI Summary": "Tóm tắt AI",
  "Condense long chapters into key points, arguments, and important terms.":
    "Rút gọn chương dài thành ý chính, lập luận và thuật ngữ quan trọng.",
  "Create Flashcards": "Tạo flashcard",
  "Turn important knowledge into short study cards that are easy to review.":
    "Biến kiến thức quan trọng thành thẻ học ngắn, dễ ôn tập.",
  "Ask AI": "Hỏi AI",
  "Ask contextual questions directly from the document you are reading.":
    "Đặt câu hỏi theo ngữ cảnh trực tiếp từ tài liệu bạn đang đọc.",
  "A clearer, deeper document reading workflow":
    "Quy trình đọc tài liệu rõ hơn và sâu hơn",
  "Each step is designed like a lightweight AI system: upload your file, extract the key ideas, create study cards, and ask questions based on the text.":
    "Mỗi bước được thiết kế như một hệ thống AI gọn nhẹ: tải file lên, trích xuất ý chính, tạo thẻ học và đặt câu hỏi dựa trên văn bản.",
  "Why Choose DeepReader?": "Vì sao chọn DeepReader?",
  "Here's why readers choose DeepReader to study long documents faster.":
    "Đây là lý do người đọc chọn DeepReader để học tài liệu dài nhanh hơn.",
  "Clear Summaries": "Tóm tắt rõ ràng",
  "Turn dense chapters into concise notes that keep the original meaning.":
    "Biến chương dày đặc thành ghi chú ngắn gọn nhưng vẫn giữ đúng ý gốc.",
  "Source-Based Answers": "Câu trả lời dựa trên nguồn",
  "Ask questions and get answers grounded in the document you uploaded.":
    "Đặt câu hỏi và nhận câu trả lời dựa trên tài liệu bạn đã tải lên.",
  "Study Cards Fast": "Tạo thẻ học nhanh",
  "Generate flashcards from key ideas so review sessions feel lighter.":
    "Tạo flashcard từ ý chính để buổi ôn tập nhẹ nhàng hơn.",
  "Calm Workspace": "Không gian học tập gọn gàng",
  "Keep reading, summaries, cards, and progress in one organized place.":
    "Giữ nội dung đọc, tóm tắt, thẻ học và tiến độ trong một nơi có tổ chức.",
  "A calm dashboard for focused study":
    "Bảng điều khiển yên tĩnh cho việc học tập trung",
  "Our dashboard helps you study smarter with clear insights, organized tools, and a calm interface so you can focus better and learn with confidence.":
    "Bảng điều khiển giúp bạn học thông minh hơn với thông tin rõ ràng, công cụ có tổ chức và giao diện nhẹ nhàng để tập trung tốt hơn.",
  "Summarize by chapter, section, or the entire document.":
    "Tóm tắt theo chương, phần hoặc toàn bộ tài liệu.",
  "Generate flashcards and review questions from the source content.":
    "Tạo flashcard và câu hỏi ôn tập từ nội dung nguồn.",
  "Track reading progress, study time, and completion status.":
    "Theo dõi tiến độ đọc, thời gian học và trạng thái hoàn thành.",
  "Chapter Summary": "Tóm tắt chương",
  "Key Ideas": "Ý chính",
  "Cards Ready": "Thẻ đã sẵn sàng",
  "Why did the author...": "Vì sao tác giả...",
  "Smart reading tools for focused study":
    "Công cụ đọc thông minh cho việc học tập trung",
  "DeepReader brings summaries, document organization, and study progress into one workspace so every reading session has a clear next step.":
    "DeepReader gom tóm tắt, quản lý tài liệu và tiến độ học vào một không gian để mỗi buổi đọc đều có bước tiếp theo rõ ràng.",
  "Structured Summaries": "Tóm tắt có cấu trúc",
  "Capture the main ideas, key terms, and important arguments from long documents.":
    "Nắm bắt ý chính, thuật ngữ và lập luận quan trọng từ tài liệu dài.",
  "Organized Library": "Thư viện ngăn nắp",
  "Keep PDFs, EPUBs, notes, and study files in one tidy workspace.":
    "Giữ PDF, EPUB, ghi chú và tài liệu học trong một không gian gọn gàng.",
  "Study Progress": "Tiến độ học tập",
  "See completed pages, review activity, and learning momentum at a glance.":
    "Xem số trang đã hoàn thành, hoạt động ôn tập và nhịp học chỉ trong nháy mắt.",
  "Read smarter, review faster and learn deeper with DeepReader AI":
    "Đọc thông minh hơn, ôn nhanh hơn và học sâu hơn với DeepReader AI",

  "Library Upload": "Tải lên thư viện",
  "Upload A New Book To Your Library": "Tải sách mới vào thư viện",
  "Upload PDFs, EPUBs, notes, and study documents. DeepReader keeps your files ready for reading, summaries, flashcards, and chatting with your content using AI.":
    "Tải PDF, EPUB, ghi chú và tài liệu học. DeepReader giữ file sẵn sàng để đọc, tóm tắt, tạo flashcard và chat với nội dung bằng AI.",
  "View Library": "Xem thư viện",
  "Your Library Collection": "Bộ sưu tập thư viện của bạn",
  "Search books, authors, formats...": "Tìm sách, tác giả, định dạng...",
  Upload: "Tải lên",
  "Login to load your library collection.":
    "Đăng nhập để tải bộ sưu tập thư viện.",
  Read: "Đọc",
  Delete: "Xóa",
  "Back to Library": "Quay lại thư viện",
  "AI Study": "Học với AI",
  "Summary, Flashcards & Chat": "Tóm tắt, Flashcard & Chat",
  Summary: "Tóm tắt",
  Chat: "Chat",
  "Saved Summary": "Tóm tắt đã lưu",
  "Latest Summary": "Tóm tắt mới nhất",
  "Generate Summary": "Tạo tóm tắt",
  "Generate Cards": "Tạo thẻ",
  "Generating...": "Đang tạo...",
  "Could not load AI study data.": "Không thể tải dữ liệu học AI.",
  "The AI response did not include a summary.":
    "Phản hồi AI không có phần tóm tắt.",
  "The AI response did not include flashcards.":
    "Phản hồi AI không có flashcard.",

  "Contact Us": "Liên hệ với chúng tôi",
  "Contact Information": "Thông tin liên hệ",
  "Contact support": "Liên hệ hỗ trợ",
  "Account information": "Thông tin tài khoản",
  "About product": "Về sản phẩm",
  "Chat AI": "Chat AI",
  "Go to Login": "Đi tới đăng nhập",
  Support: "Hỗ trợ",
  "Help and Solution": "Trợ giúp và giải pháp",
  Product: "Sản phẩm",
  "Contact us": "Liên hệ",
  "Talk to support": "Trò chuyện với hỗ trợ",
  "Support docs": "Tài liệu hỗ trợ",
  "System status": "Trạng thái hệ thống",
  "Reading workflow": "Quy trình đọc",
  "Get started now and build a smarter reading journey.":
    "Bắt đầu ngay và xây dựng hành trình đọc thông minh hơn.",
  "Enter your email here": "Nhập email của bạn tại đây",
  "Email address": "Địa chỉ email",
  "Submit email": "Gửi email",
  "© 2026 DeepReader Inc. Copyright and rights reserved":
    "© 2026 DeepReader Inc. Bản quyền được bảo lưu",
  "Terms and Conditions": "Điều khoản và điều kiện",
  "Privacy Policy": "Chính sách quyền riêng tư",

  "Building Better Reading Habits With AI-powered Learning Support":
    "Xây dựng thói quen đọc tốt hơn với hỗ trợ học tập bằng AI",
  "DeepReader is an intelligent reading platform that helps users read more efficiently, understand content faster, and remember better through AI summaries, flashcards, and document-based chat.":
    "DeepReader là nền tảng đọc thông minh giúp người dùng đọc hiệu quả hơn, hiểu nội dung nhanh hơn và ghi nhớ tốt hơn thông qua tóm tắt AI, flashcard và chat theo tài liệu.",
  "Learn More": "Tìm hiểu thêm",
  "How Does DeepReader Work": "DeepReader hoạt động như thế nào",
  "Upload documents": "Tải tài liệu lên",
  "Upload a PDF or EPUB file so the system can process the content and divide it into appropriate reading sections.":
    "Tải file PDF hoặc EPUB để hệ thống xử lý nội dung và chia thành các phần đọc phù hợp.",
  "Advanced AI tools": "Công cụ AI nâng cao",
  "AI generates chapter summaries, study flashcards, and supports contextual Q&A.":
    "AI tạo tóm tắt chương, flashcard học tập và hỗ trợ hỏi đáp theo ngữ cảnh.",
  "24/7 learning support": "Hỗ trợ học tập 24/7",
  "Users can read, review, and interact with documents anytime on the same platform.":
    "Người dùng có thể đọc, ôn tập và tương tác với tài liệu bất cứ lúc nào trên cùng một nền tảng.",
  "Together, We're Shaping A Smarter Way To Read And Learn":
    "Cùng nhau xây dựng cách đọc và học thông minh hơn",
  "DeepReader is more than just a document storage space. It's a smart learning environment where AI helps you quickly understand content, systematize knowledge, and build effective reading habits. We believe the reading experience should be intuitive, proactive, and personalized to each learner's needs.":
    "DeepReader không chỉ là nơi lưu trữ tài liệu. Đây là môi trường học tập thông minh nơi AI giúp bạn nhanh chóng hiểu nội dung, hệ thống hóa kiến thức và xây dựng thói quen đọc hiệu quả. Chúng tôi tin trải nghiệm đọc nên trực quan, chủ động và cá nhân hóa theo nhu cầu của từng người học.",
  "Living Our Mission": "Sống cùng sứ mệnh của chúng tôi",
  "Our community is creating better reading and learning experiences every day":
    "Cộng đồng của chúng tôi đang tạo nên trải nghiệm đọc và học tốt hơn mỗi ngày",
  "DeepReader helps me understand long documents faster. I can summarize chapters, ask questions, and review with flashcards in one place.":
    "DeepReader giúp tôi hiểu tài liệu dài nhanh hơn. Tôi có thể tóm tắt chương, đặt câu hỏi và ôn tập bằng flashcard trong cùng một nơi.",
  "The platform makes studying feel more structured. Instead of rereading everything, I can focus on the key ideas and review efficiently.":
    "Nền tảng giúp việc học có cấu trúc hơn. Thay vì đọc lại mọi thứ, tôi có thể tập trung vào ý chính và ôn tập hiệu quả.",
  "With DeepReader, reading becomes less overwhelming. The AI support helps me break down complex content and remember what matters.":
    "Với DeepReader, việc đọc bớt nặng nề hơn. Hỗ trợ AI giúp tôi chia nhỏ nội dung phức tạp và nhớ những điều quan trọng.",
  "Daily guidance crafted specifically for your reading goals":
    "Định hướng hằng ngày được thiết kế riêng cho mục tiêu đọc của bạn",
  "Want to organize your reading better?":
    "Bạn muốn sắp xếp việc đọc tốt hơn?",
  "Browse Library": "Duyệt thư viện",
  "Eager to review smarter with AI?": "Muốn ôn tập thông minh hơn với AI?",
  "Explore Flashcards": "Khám phá flashcard",
  "Ready to connect with the DeepReader team?":
    "Sẵn sàng kết nối với đội ngũ DeepReader?",
  "Our Contact Page": "Trang liên hệ của chúng tôi",

  "Any question or remarks? Just write us a message!":
    "Có câu hỏi hoặc góp ý? Hãy gửi tin nhắn cho chúng tôi!",
  "Say something to start a live chat!":
    "Hãy nhắn vài lời để bắt đầu trò chuyện!",
  Address: "Địa chỉ",
  Name: "Tên",
  Subject: "Chủ đề",
  Message: "Tin nhắn",
  "Write your name..": "Nhập tên của bạn..",
  "Write your email..": "Nhập email của bạn..",
  "Write your subject..": "Nhập chủ đề..",
  "Write your message..": "Nhập tin nhắn..",
  "Send Message": "Gửi tin nhắn",

  "Add PDF or EPUB documents to start reading, summarizing, creating flashcards, and chatting with your content using AI.":
    "Thêm tài liệu PDF hoặc EPUB để bắt đầu đọc, tóm tắt, tạo flashcard và chat với nội dung bằng AI.",
  "All Formats": "Tất cả định dạng",
  Unknown: "Không xác định",
  Newest: "Mới nhất",
  Oldest: "Cũ nhất",
  "Title A-Z": "Tiêu đề A-Z",
  "No documents found": "Không tìm thấy tài liệu",
  "Upload a PDF or EPUB to start building your library.":
    "Tải PDF hoặc EPUB để bắt đầu xây dựng thư viện.",
  Prev: "Trước",
  Next: "Tiếp",
  Ready: "Sẵn sàng",
  Failed: "Thất bại",
  Processing: "Đang xử lý",
  "No date yet": "Chưa có ngày",
  Chapters: "Chương",
  Sections: "Phần",
  Format: "Định dạng",
  "Deleting...": "Đang xóa...",

  "Review and practice flashcards generated from your documents.":
    "Ôn tập và luyện flashcard được tạo từ tài liệu của bạn.",
  "Generate flashcards": "Tạo flashcard",
  "Search decks or cards": "Tìm bộ thẻ hoặc thẻ",
  "Search decks or cards...": "Tìm bộ thẻ hoặc thẻ...",
  Filter: "Bộ lọc",
  "Filter by document": "Lọc theo tài liệu",
  "Filter by status": "Lọc theo trạng thái",
  "Sort decks": "Sắp xếp bộ thẻ",
  "All documents": "Tất cả tài liệu",
  "All status": "Tất cả trạng thái",
  "In progress": "Đang học",
  New: "Mới",
  Completed: "Hoàn thành",
  "Last studied": "Học gần nhất",
  "Most cards": "Nhiều thẻ nhất",
  "Start learning": "Bắt đầu học",
  "Study now": "Học ngay",
  Source: "Nguồn",
  "Mastery progress": "Tiến độ thành thạo",
  "Mini game": "Trò chơi nhỏ",
  "View cards": "Xem thẻ",

  "How can we help you study better?": "Chúng tôi có thể giúp bạn học tốt hơn như thế nào?",
  "Find quick answers about uploading documents, reading PDFs, creating summaries, building flashcards, and using study games.":
    "Tìm câu trả lời nhanh về tải tài liệu, đọc PDF, tạo tóm tắt, tạo flashcard và dùng trò chơi học tập.",
  "Open guide": "Mở hướng dẫn",
  "Still need help?": "Vẫn cần hỗ trợ?",
  "Send a message to the DeepReader team through the contact page.":
    "Gửi tin nhắn cho đội ngũ DeepReader qua trang liên hệ.",
  "Back to Help Center": "Quay lại Trung tâm hỗ trợ",
  "Step-by-step guide": "Hướng dẫn từng bước",
  "Video tutorial": "Video hướng dẫn",
  "Watch the guide": "Xem hướng dẫn",
  "YouTube tutorial": "Video hướng dẫn YouTube",
  "Your recorded guide video can be embedded here.":
    "Video hướng dẫn đã ghi của bạn có thể được nhúng tại đây.",
  "Follow these steps": "Làm theo các bước này",

  "What is DeepReader used for?": "DeepReader dùng để làm gì?",
  "DeepReader helps you store documents, read PDFs, generate summaries, create flashcards, and review knowledge with quizzes or mini games.":
    "DeepReader giúp bạn lưu tài liệu, đọc PDF, tạo tóm tắt, tạo flashcard và ôn kiến thức bằng quiz hoặc trò chơi nhỏ.",
  "How do I add a document?": "Làm sao để thêm tài liệu?",
  "Go to Library, choose Upload Document, then select your PDF or study file. After the upload finishes, the document will appear in your library.":
    "Vào Thư viện, chọn Tải tài liệu lên, rồi chọn file PDF hoặc tài liệu học. Sau khi tải xong, tài liệu sẽ xuất hiện trong thư viện.",
  "Where can I read my document?": "Tôi có thể đọc tài liệu ở đâu?",
  "Open Library, choose a document, then select Read. The reader shows one PDF page at a time. You can use Go to or scroll inside the reading area to move between pages.":
    "Mở Thư viện, chọn một tài liệu, rồi chọn Đọc. Trình đọc hiển thị từng trang PDF. Bạn có thể dùng ô Đi tới hoặc cuộn trong vùng đọc để chuyển trang.",
  "How do I create a summary?": "Làm sao để tạo tóm tắt?",
  "Open a document from Library, go to AI Study, then choose Summary. DeepReader will create a summary based on the content of the current document.":
    "Mở tài liệu từ Thư viện, vào Học với AI, rồi chọn Tóm tắt. DeepReader sẽ tạo bản tóm tắt dựa trên nội dung tài liệu hiện tại.",
  "Where do I create flashcards?": "Tôi tạo flashcard ở đâu?",
  "You can create flashcards from the AI Study area inside a document. After generation, the saved decks are collected on the Flashcards page for review.":
    "Bạn có thể tạo flashcard trong khu vực Học với AI của tài liệu. Sau khi tạo, các bộ thẻ đã lưu sẽ nằm ở trang Flashcards để ôn tập.",
  "How does document chat work?": "Chat theo tài liệu hoạt động như thế nào?",
  "In AI Study, choose Chat to ask questions about the document you are reading. This chat is meant for source-based document questions, not general app help.":
    "Trong Học với AI, chọn Chat để đặt câu hỏi về tài liệu bạn đang đọc. Chat này dành cho câu hỏi dựa trên nguồn tài liệu, không phải hỗ trợ chung của ứng dụng.",
  "How do flashcard mini games work?": "Trò chơi nhỏ flashcard hoạt động như thế nào?",
  "Go to Flashcards, choose a deck, then select Mini game. You can play Puzzle Match, Speed Challenge, or Memory Flip to practice the cards in a more interactive way.":
    "Vào Flashcards, chọn một bộ thẻ, rồi chọn Trò chơi nhỏ. Bạn có thể chơi Ghép cặp, Thử thách tốc độ hoặc Lật thẻ nhớ để luyện tập tương tác hơn.",
  "Getting Started": "Bắt đầu",
  "Set up your workspace and add your first study document.":
    "Thiết lập không gian học và thêm tài liệu đầu tiên.",
  "Which files should I upload?": "Tôi nên tải lên loại file nào?",
  "DeepReader works best with clear PDF study documents, lecture slides, notes, and structured learning materials. Clean text extraction produces better summaries, flashcards, and document chat answers.":
    "DeepReader hoạt động tốt nhất với PDF rõ chữ, slide bài giảng, ghi chú và tài liệu học có cấu trúc. Văn bản trích xuất sạch sẽ giúp tóm tắt, flashcard và câu trả lời chat tốt hơn.",
  "Reading Documents": "Đọc tài liệu",
  "Learn how to move through documents and use the reader.":
    "Tìm hiểu cách di chuyển trong tài liệu và dùng trình đọc.",
  "How do I jump to a specific page?": "Làm sao để nhảy tới một trang cụ thể?",
  "Use the Go to control in the reader, enter the page number, and confirm. You can also scroll inside the reader area to move one page at a time.":
    "Dùng ô Đi tới trong trình đọc, nhập số trang và xác nhận. Bạn cũng có thể cuộn trong vùng đọc để chuyển từng trang.",
  "How is reading progress tracked?": "Tiến độ đọc được theo dõi như thế nào?",
  "DeepReader keeps the current reading progress for your document so you can return to your study flow more easily.":
    "DeepReader lưu tiến độ đọc hiện tại của tài liệu để bạn quay lại luồng học dễ dàng hơn.",
  "AI Study Tools": "Công cụ học với AI",
  "Use summaries, flashcards, and document chat with confidence.":
    "Dùng tóm tắt, flashcard và chat tài liệu một cách tự tin.",
  "Why should document chat stay source-based?": "Vì sao chat tài liệu nên bám sát nguồn?",
  "Document chat is designed to answer from the document you are reading. This keeps answers focused and reduces unrelated or unsupported responses.":
    "Chat tài liệu được thiết kế để trả lời từ tài liệu bạn đang đọc. Điều này giúp câu trả lời tập trung và giảm nội dung không liên quan hoặc thiếu căn cứ.",
  "Flashcards and Games": "Flashcard và trò chơi",
  "Review cards, practice quizzes, and play learning games.":
    "Ôn thẻ, luyện quiz và chơi trò chơi học tập.",
  "What is a flashcard deck?": "Bộ flashcard là gì?",
  "A deck is a group of flashcards generated from one document or study section. You can study, quiz, view cards, or open mini games from the deck.":
    "Bộ thẻ là nhóm flashcard được tạo từ một tài liệu hoặc phần học. Bạn có thể học, làm quiz, xem thẻ hoặc mở trò chơi nhỏ từ bộ thẻ.",
  "How does review mode work?": "Chế độ ôn tập hoạt động như thế nào?",
  "Review mode shows one flashcard at a time. The front shows the question, and flipping the card reveals the answer so you can practice active recall.":
    "Chế độ ôn tập hiển thị từng flashcard. Mặt trước là câu hỏi, lật thẻ sẽ hiện câu trả lời để bạn luyện nhớ chủ động.",

  "Add documents": "Thêm tài liệu",
  "Upload study files and keep them in your private library.":
    "Tải file học tập lên và lưu trong thư viện riêng.",
  "Use this guide to learn the basic document upload flow, where uploaded files appear, and what to check before using AI study tools.":
    "Dùng hướng dẫn này để hiểu quy trình tải tài liệu, nơi file đã tải xuất hiện và những điều cần kiểm tra trước khi dùng công cụ học AI.",
  "Go to Library": "Đi tới Thư viện",
  "Open your Library": "Mở Thư viện của bạn",
  "Go to the Library page. This is where your uploaded PDFs and study files are organized.":
    "Vào trang Thư viện. Đây là nơi PDF và file học tập đã tải lên được sắp xếp.",
  "Upload a study file": "Tải file học tập lên",
  "Choose Upload Document, select your file, and wait until the upload finishes.":
    "Chọn Tải tài liệu lên, chọn file và chờ quá trình tải hoàn tất.",
  "Check the document card": "Kiểm tra thẻ tài liệu",
  "After upload, the document card appears in Library. From there, you can read, summarize, create flashcards, or chat with the document.":
    "Sau khi tải lên, thẻ tài liệu sẽ xuất hiện trong Thư viện. Từ đó, bạn có thể đọc, tóm tắt, tạo flashcard hoặc chat với tài liệu.",
  "Study with AI": "Học với AI",
  "Open a document and use Summary, Flashcards, or Chat.":
    "Mở tài liệu và dùng Tóm tắt, Flashcards hoặc Chat.",
  "This guide explains how the AI Study panel works when you are reading a document.":
    "Hướng dẫn này giải thích cách bảng Học với AI hoạt động khi bạn đang đọc tài liệu.",
  "Open Library": "Mở Thư viện",
  "Open a document": "Mở tài liệu",
  "From Library, choose the document you want to study and open the reader.":
    "Từ Thư viện, chọn tài liệu bạn muốn học và mở trình đọc.",
  "Use Summary": "Dùng Tóm tắt",
  "Choose Summary to create a clear overview based on the content of the current document.":
    "Chọn Tóm tắt để tạo phần tổng quan rõ ràng dựa trên nội dung tài liệu hiện tại.",
  "Choose Flashcards to generate study cards from important ideas in the document.":
    "Chọn Flashcards để tạo thẻ học từ các ý quan trọng trong tài liệu.",
  "Ask document questions": "Đặt câu hỏi theo tài liệu",
  "Choose Chat to ask questions grounded in the document you are reading.":
    "Chọn Chat để đặt câu hỏi bám sát tài liệu bạn đang đọc.",
  "Review flashcards": "Ôn tập flashcard",
  "Choose a deck, study cards, take quizzes, or play games.":
    "Chọn bộ thẻ, học thẻ, làm quiz hoặc chơi trò chơi.",
  "Use this guide to understand the Flashcards page and the study modes available for each deck.":
    "Dùng hướng dẫn này để hiểu trang Flashcards và các chế độ học có trong mỗi bộ thẻ.",
  "Go to Flashcards": "Đi tới Flashcards",
  "Choose a deck": "Chọn một bộ thẻ",
  "Open Flashcards and pick the deck generated from the document you want to review.":
    "Mở Flashcards và chọn bộ thẻ được tạo từ tài liệu bạn muốn ôn.",
  "Study the cards": "Học các thẻ",
  "Use Study now to open review mode. Read the question, flip the card, and recall the answer.":
    "Dùng Học ngay để mở chế độ ôn tập. Đọc câu hỏi, lật thẻ và nhớ lại câu trả lời.",
  "Practice with quiz": "Luyện bằng quiz",
  "Use quiz mode to test your knowledge with multiple-choice questions.":
    "Dùng chế độ quiz để kiểm tra kiến thức bằng câu hỏi trắc nghiệm.",
  "Play mini games": "Chơi trò chơi nhỏ",
  "Use Mini game to practice with Puzzle Match, Speed Challenge, or Memory Flip.":
    "Dùng Trò chơi nhỏ để luyện với Ghép cặp, Thử thách tốc độ hoặc Lật thẻ nhớ.",

  "No flashcard decks yet": "Chưa có bộ flashcard nào",
  "Generate flashcards from your uploaded documents to start studying.":
    "Tạo flashcard từ tài liệu đã tải lên để bắt đầu học.",
  "Back to decks": "Quay lại bộ thẻ",
  "Loading deck...": "Đang tải bộ thẻ...",
  "This flashcard deck could not be found.": "Không tìm thấy bộ flashcard này.",
  "Could not load this deck.": "Không thể tải bộ thẻ này.",
  "Please log in to open this flashcard deck.": "Vui lòng đăng nhập để mở bộ flashcard này.",
  "No cards in this deck": "Bộ thẻ này chưa có thẻ",
  "Create flashcards for this document before opening study modes.":
    "Hãy tạo flashcard cho tài liệu này trước khi mở các chế độ học.",
  "Review mode": "Chế độ ôn tập",
  "Study flashcards": "Học flashcard",
  Card: "Thẻ",
  Question: "Câu hỏi",
  Answer: "Câu trả lời",
  "Show question": "Hiện câu hỏi",
  "Show answer": "Hiện câu trả lời",
  Previous: "Trước",
  Done: "Hoàn tất",
  "No cards available for review": "Không có thẻ để ôn tập",
  "This deck does not have any cards ready for review.":
    "Bộ thẻ này chưa có thẻ nào sẵn sàng để ôn tập.",
  "Quiz result": "Kết quả quiz",
  Accuracy: "Độ chính xác",
  "Cards to review again": "Thẻ cần ôn lại",
  "Retry Quiz": "Làm lại quiz",
  "No quiz cards available": "Không có thẻ quiz",
  "This deck does not have enough cards for quiz mode.":
    "Bộ thẻ này chưa có đủ thẻ cho chế độ quiz.",
  "Multiple choice": "Trắc nghiệm",
  "Quiz practice": "Luyện quiz",
  "Correct. Nice recall.": "Chính xác. Nhớ rất tốt.",
  Reset: "Đặt lại",
  "See Result": "Xem kết quả",
  "Next Question": "Câu hỏi tiếp theo",
  Submit: "Nộp",
  Cards: "Thẻ",
  "Cards in this deck": "Các thẻ trong bộ này",
  Edit: "Sửa",
  Flashcard: "Flashcard",
  "Close flashcard": "Đóng flashcard",
  "Edit card": "Sửa thẻ",
  "Local card edit": "Chỉnh sửa thẻ cục bộ",
  "Close editor": "Đóng trình sửa",
  "Save Edit": "Lưu chỉnh sửa",
  Learning: "Đang học",
  Mastered: "Đã thuộc",
  Weak: "Cần ôn",
  "Not started yet": "Chưa bắt đầu",

  "Learning Games": "Trò chơi học tập",
  "Flashcard Game Zone": "Khu trò chơi flashcard",
  "Turn your flashcards into quick challenges, matching games, and memory battles.":
    "Biến flashcard thành thử thách nhanh, trò ghép cặp và màn luyện trí nhớ.",
  "Current deck": "Bộ thẻ hiện tại",
  cards: "thẻ",
  "cards ready": "thẻ sẵn sàng",
  mastered: "đã thuộc",
  weak: "cần ôn",
  "Puzzle Match": "Ghép cặp",
  "Match Terms": "Ghép thuật ngữ",
  "Match each concept with the correct definition before time runs out.":
    "Ghép từng khái niệm với định nghĩa đúng trước khi hết thời gian.",
  "Pair concepts with the perfect answer.": "Ghép khái niệm với câu trả lời phù hợp.",
  "Complete all pairs": "Hoàn thành tất cả cặp",
  "Play Match": "Chơi ghép cặp",
  "Choose a concept, then choose its matching definition. Consecutive correct matches build your combo.":
    "Chọn một khái niệm, rồi chọn định nghĩa tương ứng. Các lần ghép đúng liên tiếp sẽ tăng combo.",
  "Speed Challenge": "Thử thách tốc độ",
  "Speed Run": "Chạy tốc độ",
  "Beat the clock and build your combo.": "Chạy đua với thời gian và tăng combo.",
  "Answer quickly before the timer hits zero.": "Trả lời thật nhanh trước khi đồng hồ về 0.",
  "Score as high as possible": "Ghi điểm cao nhất có thể",
  "Start Speed Run": "Bắt đầu tốc độ",
  "Pick the correct answer fast. Correct answers add score and combo points.":
    "Chọn đáp án đúng thật nhanh. Trả lời đúng sẽ cộng điểm và điểm combo.",
  "Memory Flip": "Lật thẻ nhớ",
  "Flip, remember, and find the hidden pairs.":
    "Lật thẻ, ghi nhớ và tìm các cặp ẩn.",
  "Find matching question-answer pairs.": "Tìm các cặp câu hỏi - câu trả lời khớp nhau.",
  "Find all pairs with fewer moves": "Tìm tất cả cặp với ít lượt nhất",
  "Play Memory": "Chơi lật thẻ nhớ",
  "Flip two cards at a time. Match each question with its answer to clear the board.":
    "Lật hai thẻ mỗi lượt. Ghép từng câu hỏi với câu trả lời để hoàn thành bàn chơi.",
  "Game Setup": "Thiết lập trò chơi",
  "Close setup": "Đóng thiết lập",
  "Round settings": "Cài đặt lượt chơi",
  "Tune your session": "Tùy chỉnh phiên chơi",
  Pairs: "Cặp",
  "Choose how many question-answer pairs appear on the board.":
    "Chọn số cặp câu hỏi - câu trả lời xuất hiện trên bàn chơi.",
  "Choose how many cards this game should use.":
    "Chọn số thẻ trò chơi này sẽ dùng.",
  "Time limit": "Giới hạn thời gian",
  "Pick a timer length for this speed round.":
    "Chọn thời lượng đồng hồ cho lượt chơi tốc độ này.",
  Mode: "Chế độ",
  "Relaxed keeps the game calm. Timed adds pressure for a faster challenge.":
    "Thư giãn giúp trò chơi nhẹ nhàng. Tính giờ tạo áp lực cho thử thách nhanh hơn.",
  Optional: "Tùy chọn",
  relaxed: "thư giãn",
  timed: "tính giờ",
  "Pick how long this timed round should last.":
    "Chọn thời lượng cho lượt chơi tính giờ này.",
  Deck: "Bộ thẻ",
  "Ready to play": "Sẵn sàng chơi",
  Goal: "Mục tiêu",
  "Start Game": "Bắt đầu chơi",
  pairs: "cặp",
  sec: "giây",
  "Back to Games": "Quay lại trò chơi",
  "Game Result": "Kết quả trò chơi",
  "Great job!": "Làm tốt lắm!",
  "Great matching run.": "Lượt ghép cặp rất tốt.",
  "Time is up. Nice matching run.": "Hết giờ. Bạn ghép cặp khá tốt.",
  "Clock stopped. Nice speed run.": "Đồng hồ đã dừng. Lượt tốc độ rất tốt.",
  "Time is up. Try another memory run.": "Hết giờ. Hãy thử một lượt lật thẻ khác.",
  "Memory board cleared.": "Đã hoàn thành bàn lật thẻ.",
  "You practiced": "Bạn đã luyện",
  "and turned your cards into active recall.":
    "và biến các thẻ thành bài luyện nhớ chủ động.",
  Score: "Điểm",
  Time: "Thời gian",
  "Review these cards again": "Ôn lại các thẻ này",
  "Play Again": "Chơi lại",
  "Try Another Game": "Thử trò chơi khác",
  "Review Weak Cards": "Ôn thẻ yếu",
  Matches: "Cặp đúng",
  Combo: "Combo",
  Timer: "Đồng hồ",
  "All pairs": "Tất cả cặp",
  Concepts: "Khái niệm",
  Definitions: "Định nghĩa",
  Answered: "Đã trả lời",
  "No question available.": "Không có câu hỏi.",
  Moves: "Lượt",
  Open: "Đang mở",
  "Find pairs": "Tìm cặp",
  Flip: "Lật",
  "Q:": "H:",
  "A:": "Đ:",

  "Loading study decks...": "Đang tải bộ thẻ học...",
  "All decks": "Tất cả bộ thẻ",
  "No decks match your filters": "Không có bộ thẻ nào khớp bộ lọc",
  "Try clearing search, document, or status filters.":
    "Hãy thử xóa tìm kiếm, bộ lọc tài liệu hoặc trạng thái.",
  "Could not load flashcard decks.": "Không thể tải các bộ flashcard.",
  "Select a ready document before generating cards.":
    "Hãy chọn một tài liệu đã sẵn sàng trước khi tạo thẻ.",
  "No flashcards were generated.": "Không có flashcard nào được tạo.",
  "Could not generate flashcards.": "Không thể tạo flashcard.",
  "Source:": "Nguồn:",
  "Create from Documents": "Tạo từ tài liệu",
  "Build a study deck": "Tạo bộ thẻ học",
  "Close create deck modal": "Đóng cửa sổ tạo bộ thẻ",
  "Number of cards": "Số lượng thẻ",
  "Question type": "Loại câu hỏi",
  "Content scope": "Phạm vi nội dung",
  Back: "Quay lại",
  Continue: "Tiếp tục",
  "Generate Preview": "Tạo bản xem trước",
  "Add to Library": "Thêm vào thư viện",
  Document: "Tài liệu",
  Generate: "Tạo",
  Preview: "Xem trước",
  "Generating flashcards": "Đang tạo flashcard",
  "DeepReader is preparing a clean study deck from your document.":
    "DeepReader đang chuẩn bị một bộ thẻ học gọn gàng từ tài liệu của bạn.",
  "No documents available": "Không có tài liệu nào",
  "Please upload a document in the Documents page first.":
    "Vui lòng tải tài liệu lên ở trang Tài liệu trước.",
  "Go to Documents": "Đi tới Tài liệu",
  "Ready to generate preview": "Sẵn sàng tạo bản xem trước",
  "Review generated cards here before using the deck in Library.":
    "Xem lại các thẻ đã tạo tại đây trước khi dùng bộ thẻ trong Thư viện.",
  Bilingual: "Song ngữ",
  Definition: "Định nghĩa",
  Concept: "Khái niệm",
  Comparison: "So sánh",
  Example: "Ví dụ",
  Mixed: "Hỗn hợp",
  "Whole document": "Toàn bộ tài liệu",
  "Key sections": "Các phần chính",
  "Weak topics": "Chủ đề còn yếu",
  sections: "phần",
};

const originalTextByNode = new WeakMap<Node, string>();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"];
const SKIP_TRANSLATION_SELECTOR =
  "script,style,textarea,code,pre,[data-i18n-skip]";

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

function isLocale(value: string | null): value is AppLocale {
  return value === "en" || value === "vi";
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function translatedDynamicText(value: string) {
  let match = value.match(/^(\d+) decks? - (\d+) cards? - (\d+) mastered$/);
  if (match) {
    return `${match[1]} bộ thẻ - ${match[2]} thẻ - ${match[3]} đã thuộc`;
  }

  match = value.match(/^(\d+) decks? [·Â]+ (\d+) cards? [·Â]+ (\d+) mastered$/);
  if (match) {
    return `${match[1]} bộ thẻ · ${match[2]} thẻ · ${match[3]} đã thuộc`;
  }

  match = value.match(/^(\d+) deck [·Â]+ (\d+) cards? [·Â]+ (\d+) mastered$/);
  if (match) {
    return `${match[1]} bộ thẻ · ${match[2]} thẻ · ${match[3]} đã thuộc`;
  }

  match = value.match(/^(\d+) cards? ready$/);
  if (match) {
    return `${match[1]} thẻ sẵn sàng`;
  }

  match = value.match(/^(\d+) cards?$/);
  if (match) {
    return `${match[1]} thẻ`;
  }

  match = value.match(/^(\d+) mastered$/);
  if (match) {
    return `${match[1]} đã thuộc`;
  }

  match = value.match(/^(\d+) weak$/);
  if (match) {
    return `${match[1]} cần ôn`;
  }

  match = value.match(/^(\d+) pairs$/);
  if (match) {
    return `${match[1]} cặp`;
  }

  match = value.match(/^(\d+) sec$/);
  if (match) {
    return `${match[1]} giây`;
  }

  match = value.match(/^Question (\d+) of (\d+)$/);
  if (match) {
    return `Câu hỏi ${match[1]} / ${match[2]}`;
  }

  match = value.match(/^Card (\d+) of (\d+)$/);
  if (match) {
    return `Thẻ ${match[1]} / ${match[2]}`;
  }

  match = value.match(/^Card (\d+)$/);
  if (match) {
    return `Thẻ ${match[1]}`;
  }

  match = value.match(/^Mastery progress (\d+)%$/);
  if (match) {
    return `Tiến độ thành thạo ${match[1]}%`;
  }

  match = value.match(/^(.+) - (\d+) cards?$/);
  if (match) {
    return `${match[1]} - ${match[2]} thẻ`;
  }

  match = value.match(/^(\d+) cards? [·Â]+ Not started yet$/);
  if (match) {
    return `${match[1]} thẻ · Chưa bắt đầu`;
  }

  match = value.match(/^(\d+) cards? [·Â]+ Last studied (.+)$/);
  if (match) {
    return `${match[1]} thẻ · Học gần nhất ${match[2]}`;
  }

  match = value.match(/^(.+) [·Â]+ (\d+) sections [·Â]+ (.+)$/);
  if (match) {
    return `${match[1]} · ${match[2]} phần · ${match[3]}`;
  }

  return null;
}

function translatedText(value: string, locale: AppLocale) {
  if (locale === "en") {
    return value;
  }

  const normalizedValue = normalizeText(value);

  return (
    VI_TRANSLATIONS[normalizedValue] ??
    translatedDynamicText(normalizedValue) ??
    value
  );
}

function withOriginalSpacing(original: string, next: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";

  return `${leading}${next}${trailing}`;
}

function shouldTranslateTextNode(node: Node) {
  const parent = node.parentElement;

  return Boolean(
    parent &&
      !parent.closest(SKIP_TRANSLATION_SELECTOR) &&
      node.nodeValue?.trim(),
  );
}

function translateTextNode(node: Node, locale: AppLocale) {
  if (!shouldTranslateTextNode(node)) {
    return;
  }

  const current = node.nodeValue ?? "";
  const storedOriginal = originalTextByNode.get(node);
  const storedTranslation = storedOriginal
    ? withOriginalSpacing(storedOriginal, translatedText(storedOriginal, "vi"))
    : null;
  const original =
    storedOriginal && (current === storedOriginal || current === storedTranslation)
      ? storedOriginal
      : current;

  originalTextByNode.set(node, original);

  const next =
    locale === "vi"
      ? withOriginalSpacing(original, translatedText(original, locale))
      : original;

  if (node.nodeValue !== next) {
    node.nodeValue = next;
  }
}

function translateAttributes(element: Element, locale: AppLocale) {
  if (element.closest(SKIP_TRANSLATION_SELECTOR)) {
    return;
  }

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);

    if (!current?.trim()) {
      continue;
    }

    const storageAttribute = `data-i18n-original-${attribute}`;
    const storedOriginal = element.getAttribute(storageAttribute);
    const storedTranslation = storedOriginal
      ? translatedText(storedOriginal, "vi")
      : null;
    const original =
      storedOriginal && (current === storedOriginal || current === storedTranslation)
        ? storedOriginal
        : current;

    if (element.getAttribute(storageAttribute) !== original) {
      element.setAttribute(storageAttribute, original);
    }

    const next = locale === "vi" ? translatedText(original, locale) : original;

    if (current !== next) {
      element.setAttribute(attribute, next);
    }
  }
}

function translateElementTree(root: ParentNode | Node, locale: AppLocale) {
  const ownerDocument =
    root instanceof Document ? root : root.ownerDocument ?? document;
  const walker = ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return shouldTranslateTextNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );

  const textNodes: Node[] = [];
  let current = walker.nextNode();

  while (current) {
    textNodes.push(current);
    current = walker.nextNode();
  }

  textNodes.forEach((node) => translateTextNode(node, locale));

  const elements =
    root instanceof Element
      ? [root, ...Array.from(root.querySelectorAll("*"))]
      : root instanceof Document || root instanceof DocumentFragment
        ? Array.from(root.querySelectorAll("*"))
        : [];

  elements.forEach((element) => translateAttributes(element, locale));
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const hasLoadedPreferencesRef = useRef(false);
  const isTranslatingRef = useRef(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

      hasLoadedPreferencesRef.current = true;

      if (isLocale(storedLocale)) {
        setLocaleState(storedLocale);
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.lang = locale === "vi" ? "vi" : "en";
    root.dataset.locale = locale;

    if (hasLoadedPreferencesRef.current) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }

    isTranslatingRef.current = true;
    translateElementTree(document.body, locale);
    isTranslatingRef.current = false;
  }, [locale]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      if (isTranslatingRef.current) {
        return;
      }

      isTranslatingRef.current = true;

      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          translateElementTree(node, locale);
        });

        if (mutation.type === "characterData") {
          translateTextNode(mutation.target, locale);
        }

        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateAttributes(mutation.target, locale);
        }
      }

      isTranslatingRef.current = false;
    });

    observer.observe(document.body, {
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => (current === "en" ? "vi" : "en"));
  }, []);

  const t = useCallback(
    (text: string) => (locale === "vi" ? translatedText(text, locale) : text),
    [locale],
  );

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, setLocale, t, toggleLocale],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error(
      "useAppPreferences must be used inside AppPreferencesProvider.",
    );
  }

  return context;
}
