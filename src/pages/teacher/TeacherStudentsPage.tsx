import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, CheckCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState("");

  const { data: students } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (!roles?.length) return [];
      const studentIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", studentIds);
      const { data: results } = await supabase.from("test_results").select("user_id, score");
      
      return (profiles || []).map((p) => {
        const userResults = (results || []).filter((r) => r.user_id === p.user_id);
        const avgScore = userResults.length ? Math.round(userResults.reduce((s, r) => s + r.score, 0) / userResults.length) : 0;
        const isExpired = p.expires_at ? new Date(p.expires_at) < new Date() : false;
        return { ...p, tests: userResults.length, avgScore, isExpired };
      });
    },
  });

  const filtered = (students || []).filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">O'quvchilar</h1>
        <p className="text-sm text-muted-foreground">O'quvchilaringiz ro'yxati va natijalarini ko'ring</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> {filtered.length} ta o'quvchi
          </span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Qidirish..." className="pl-9 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Ism</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Testlar</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">O'rtacha</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Muddat</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Holat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {s.full_name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{s.tests} ta</td>
                  <td className="py-2.5 px-4">
                    <span className={`font-semibold ${s.avgScore >= 80 ? "text-success" : s.avgScore >= 60 ? "text-warning" : "text-destructive"}`}>
                      {s.avgScore}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground hidden md:table-cell">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString("uz") : "Cheksiz"}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.isExpired ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                    }`}>
                      {s.isExpired ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {s.isExpired ? "Muddati tugagan" : "Faol"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">O'quvchilar topilmadi</div>
        )}
      </div>
    </DashboardLayout>
  );
}
