"use client";

import { useState, useTransition } from "react";
import { Loader2, X, Plus, Sparkles, Tag } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateTopics } from "@/app/actions/preferences";

const SUGGESTED_TOPICS = [
  "React",
  "TypeScript",
  "Next.js",
  "Node.js",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "DevOps",
  "Kubernetes",
  "Docker",
  "AWS",
  "AI/ML",
  "Web3",
  "Security",
  "Performance",
  "Testing",
  "CI/CD",
  "PostgreSQL",
  "Redis",
];

const TOPIC_CATEGORIES = {
  "Frontend": ["React", "Vue", "Angular", "Next.js", "Svelte", "CSS", "JavaScript", "TypeScript"],
  "Backend": ["Node.js", "Python", "Go", "Rust", "Java", "PHP", "Ruby"],
  "DevOps": ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD"],
  "Data": ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Kafka", "GraphQL"],
  "AI/ML": ["ChatGPT", "LLM", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow"],
};

interface TopicsManagementProps {
  topics: string[];
}

export function TopicsManagement({ topics: initialTopics }: TopicsManagementProps) {
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [newTopic, setNewTopic] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showCategories, setShowCategories] = useState(false);

  const addTopic = (topic: string) => {
    if (topic && !topics.includes(topic)) {
      const newTopics = [...topics, topic];
      setTopics(newTopics);
      startTransition(async () => {
        await updateTopics(newTopics);
      });
    }
    setNewTopic("");
  };

  const removeTopic = (topic: string) => {
    const newTopics = topics.filter((t) => t !== topic);
    setTopics(newTopics);
    startTransition(async () => {
      await updateTopics(newTopics);
    });
  };

  const addMultipleTopics = (newTopics: string[]) => {
    const uniqueTopics = [...new Set([...topics, ...newTopics])];
    setTopics(uniqueTopics);
    startTransition(async () => {
      await updateTopics(uniqueTopics);
    });
  };

  const clearAllTopics = () => {
    setTopics([]);
    startTransition(async () => {
      await updateTopics([]);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Интересующие темы
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          Выберите темы для персонализации саммари и фильтрации контента
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Выбранные темы */}
        {topics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Выбранные темы ({topics.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllTopics}
                className="h-7 text-xs text-muted-foreground"
              >
                Очистить все
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeTopic(topic)}
                >
                  {topic}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Добавление новой темы */}
        <div className="flex gap-2">
          <Input
            placeholder="Добавить свою тему..."
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTopic(newTopic);
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => addTopic(newTopic)}
            disabled={!newTopic}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Популярные темы */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Популярные темы</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.filter((t) => !topics.includes(t))
              .slice(0, 12)
              .map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => addTopic(topic)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {topic}
                </Badge>
              ))}
          </div>
        </div>

        {/* Категории тем */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCategories(!showCategories)}
            className="text-sm text-muted-foreground"
          >
            {showCategories ? "Скрыть категории" : "Показать категории"}
          </Button>

          {showCategories && (
            <div className="space-y-3 pt-2">
              {Object.entries(TOPIC_CATEGORIES).map(([category, categoryTopics]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addMultipleTopics(categoryTopics)}
                      className="h-6 text-xs"
                    >
                      Добавить все
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {categoryTopics.map((topic) => (
                      <Badge
                        key={topic}
                        variant={topics.includes(topic) ? "secondary" : "outline"}
                        className={`cursor-pointer text-xs ${
                          topics.includes(topic)
                            ? "hover:bg-destructive/20"
                            : "hover:bg-muted"
                        }`}
                        onClick={() =>
                          topics.includes(topic) ? removeTopic(topic) : addTopic(topic)
                        }
                      >
                        {topics.includes(topic) ? (
                          <>
                            {topic}
                            <X className="ml-1 h-2 w-2" />
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-2 w-2" />
                            {topic}
                          </>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
