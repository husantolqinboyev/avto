import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Users, GraduationCap, FileText, BookOpen, Bot, Car } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dash-stats"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("role");
      const students = roles?.filter((r) => r.role === "student").length || 0;
      const teachers = roles?.filter((r) => r.role === "teacher").length || 0;
      const { data: tickets } = await supabase.from("tickets").select("id");
      const { data: topics } = await supabase.from("topics").select("id");
      return { students, teachers, tickets: tickets?.length || 0, topics: topics?.length || 0 };
    },
  });

  const { data: recentResults } = useQuery({
    queryKey: ["admin-recent-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title, ticket_number)")
        .order("completed_at", { ascending: false })
        .limit(5);
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      return data.map((r) => ({ ...r, student_name: map[r.user_id] || "Noma'lum" }));
    },
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Boshqaruv paneli</h1>
        <p className="text-sm text-muted-foreground">Avtomaktab tizimining umumiy ko'rinishi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="O'quvchilar" value={stats?.students || 0} icon={Users} variant="primary" />
        <StatCard title="O'qituvchilar" value={stats?.teachers || 0} icon={GraduationCap} variant="success" />
        <StatCard title="Biletlar" value={stats?.tickets || 0} icon={FileText} variant="warning" />
        <StatCard title="Mavzular" value={stats?.topics || 0} icon={BookOpen} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-5 shadow-card"
      >
        <h3 className="font-display font-semibold text-foreground mb-4">So'nggi test natijalari</h3>
        <div className="space-y-3">
          {(recentResults || []).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                r.score >= 80 ? "bg-success/10 text-success" : r.score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              }`}>
                {r.score}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.student_name}</p>
                <p className="text-xs text-muted-foreground">
                  Bilet #{r.tickets?.ticket_number} · {r.correct_answers}/{r.total_questions} to'g'ri
                </p>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {new Date(r.completed_at).toLocaleDateString("uz")}
              </span>
            </div>
          ))}
          {(!recentResults || recentResults.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">Hali natijalar yo'q</p>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
