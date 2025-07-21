export default function Footer() {
  return (
    <footer className="py-8 text-center text-sm text-white border-t bg-[#1e293b] flex flex-col gap-2 mt-8">
      <div className="flex justify-center gap-4 mb-2">
        <a href="#" aria-label="Instagram" className="hover:underline text-[#fb7185] hover:text-[#fbbf24] transition-colors">Instagram</a>
        <a href="#" aria-label="Email" className="hover:underline text-[#38bdf8] hover:text-[#fbbf24] transition-colors">Email</a>
        <a href="#" aria-label="GitHub" className="hover:underline text-[#fbbf24] hover:text-[#38bdf8] transition-colors">GitHub</a>
      </div>
      <div>
        © {new Date().getFullYear()} ForSchool · Progetto open source per la scuola
      </div>
    </footer>
  );
} 