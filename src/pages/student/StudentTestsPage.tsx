import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText, Play, CheckCircle, XCircle, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  order_num: number;
}

export default function StudentTestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now());

  const { data: tickets } = useQuery({
    queryKey: ["student-tickets"],
    queryFn: async () => {
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      return data || [];
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["ticket-questions", activeTicketId],
    enabled: !!activeTicketId,
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("ticket_id", activeTicketId!)
        .order("order_num");
      return (data || []) as Question[];
    },
  });

  const { data: myResults, refetch: refetchResults } = useQuery({
    queryKey: ["my-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const q = questions?.[currentQ];
  const totalQ = questions?.length || 0;

  const handleAnswer = (option: string) => {
    setAnswers({ ...answers, [currentQ]: option });
  };

  const handleFinish = async () => {
    if (!questions || !activeTicketId || !user) return;
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const answersArray = questions.map((q, i) => ({
      question_id: q.id,
      selected: answers[i] || null,
      correct: answers[i] === q.correct_answer,
    }));

    await supabase.from("test_results").insert({
      user_id: user.id,
      ticket_id: activeTicketId,
      score,
      total_questions: questions.length,
      correct_answers: correct,
      answers: answersArray,
      time_spent_seconds: timeSpent,
    });

    setShowResults(true);
    refetchResults();
    toast({ title: `Test yakunlandi! Natija: ${score}%` });
  };

  const resetTest = () => {
    setActiveTicketId(null);
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);
  };

  // Active test view
  if (activeTicketId && questions && !showResults) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={resetTest}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Ortga
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentQ + 1} / {totalQ}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted mb-6 overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all"
              style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
            />
          </div>

          {q && (
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <p className="text-base font-medium text-foreground mb-4">{q.question_text}</p>
              {q.image_url && (
                <img src={q.image_url} alt="" className="w-full max-h-48 object-contain rounded-lg mb-4 bg-muted/30" />
              )}
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      answers[currentQ] === opt
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(currentQ - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Oldingi
            </Button>
            {currentQ < totalQ - 1 ? (
              <Button size="sm" onClick={() => setCurrentQ(currentQ + 1)}>
                Keyingi <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} disabled={Object.keys(answers).length === 0}>
                Yakunlash <CheckCircle className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Results view
  if (showResults && questions) {
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-3 ${
              score >= 80 ? "bg-success/10 text-success" : score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
            }`}>
              {score}%
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {score >= 80 ? "Ajoyib!" : score >= 60 ? "Yaxshi" : "Ko'proq mashq qiling"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {correct} / {questions.length} ta to'g'ri javob
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correct_answer;
              return (
                <div key={q.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                      {!isCorrect && (
                        <p className="text-xs text-muted-foreground mt-1">
                          To'g'ri javob: <span className="text-success font-medium">{q.correct_answer}</span>
                        </p>
                      )}
                      {q.explanation && !isCorrect && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Button onClick={resetTest}>Biletlar ro'yxatiga qaytish</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Tickets list
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Testlar</h1>
        <p className="text-sm text-muted-foreground">Biletni tanlang va test yechishni boshlang</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tickets || []).map((ticket) => {
          const lastResult = myResults?.find((r) => r.ticket_id === ticket.id);
          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer"
              onClick={() => {
                setActiveTicketId(ticket.id);
                setCurrentQ(0);
                setAnswers({});
                setShowResults(false);
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">
                    Bilet #{ticket.ticket_number}
                  </p>
                  <p className="text-xs text-muted-foreground">{ticket.title}</p>
                </div>
              </div>
              {lastResult ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-medium ${lastResult.score >= 80 ? "text-success" : lastResult.score >= 60 ? "text-warning" : "text-destructive"}`}>
                    {lastResult.score}%
                  </span>
                  <span className="text-muted-foreground">· so'nggi natija</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Play className="w-3 h-3" /> Hali yechilmagan
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {(!tickets || tickets.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Hali biletlar yo'q</p>
        </div>
      )}
    </DashboardLayout>
  );
}
