import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentResultsPage() {
  const { user } = useAuth();

  const { data: results } = useQuery({
    queryKey: ["student-results", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title, ticket_number)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
  });

  const avgScore = results?.length
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Natijalar</h1>
        <p className="text-sm text-muted-foreground">Barcha test natijalaringiz</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-foreground">{results?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Jami testlar</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className={`text-2xl font-bold ${avgScore >= 80 ? "text-success" : avgScore >= 60 ? "text-warning" : "text-destructive"}`}>{avgScore}%</p>
          <p className="text-xs text-muted-foreground">O'rtacha ball</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-success">{results?.filter((r) => r.score >= 80).length || 0}</p>
          <p className="text-xs text-muted-foreground">A'lo natijalar</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-destructive">{results?.filter((r) => r.score < 60).length || 0}</p>
          <p className="text-xs text-muted-foreground">Qoniqarsiz</p>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {(results || []).map((r, i) => {
          const ticket = r.tickets as any;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                r.score >= 80 ? "bg-success/10 text-success" : r.score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              }`}>
                {r.score}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  Bilet #{ticket?.ticket_number}: {ticket?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.correct_answers}/{r.total_questions} to'g'ri · {Math.round((r.time_spent_seconds || 0) / 60)} daqiqa
                </p>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                {new Date(r.completed_at).toLocaleDateString("uz")}
              </div>
              {r.score >= 80 ? <CheckCircle className="w-5 h-5 text-success shrink-0" /> : <XCircle className="w-5 h-5 text-destructive shrink-0" />}
            </motion.div>
          );
        })}
      </div>

      {(!results || results.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Hali test natijalaringiz yo'q</p>
        </div>
      )}
    </DashboardLayout>
  );
}
