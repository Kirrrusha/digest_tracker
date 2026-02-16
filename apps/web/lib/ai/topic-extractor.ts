/**
 * Известные технические темы и их варианты написания
 */
const KNOWN_TOPICS: Record<string, string[]> = {
  // Frontend Frameworks
  React: ["react", "reactjs", "react.js", "реакт"],
  Vue: ["vue", "vuejs", "vue.js", "вью"],
  Angular: ["angular", "angularjs", "ангуляр"],
  Svelte: ["svelte", "sveltejs"],
  "Next.js": ["next", "nextjs", "next.js", "некст"],
  Nuxt: ["nuxt", "nuxtjs", "nuxt.js"],
  Remix: ["remix"],
  Astro: ["astro"],

  // Languages
  TypeScript: ["typescript", "ts", "тайпскрипт"],
  JavaScript: ["javascript", "js", "джаваскрипт", "жс"],
  Python: ["python", "py", "питон"],
  Go: ["golang", "go lang"],
  Rust: ["rust", "раст"],
  Java: ["java", "джава"],
  "C#": ["csharp", "c#", "шарп"],
  Kotlin: ["kotlin", "котлин"],
  Swift: ["swift", "свифт"],
  PHP: ["php", "пхп"],

  // Backend
  "Node.js": ["node", "nodejs", "node.js", "нода"],
  Deno: ["deno"],
  Bun: ["bun"],
  Express: ["express", "expressjs"],
  Fastify: ["fastify"],
  NestJS: ["nest", "nestjs"],
  Django: ["django", "джанго"],
  FastAPI: ["fastapi"],
  Spring: ["spring", "spring boot", "springboot"],

  // Databases
  PostgreSQL: ["postgres", "postgresql", "постгрес"],
  MySQL: ["mysql", "мускул"],
  MongoDB: ["mongodb", "mongo", "монго"],
  Redis: ["redis", "редис"],
  SQLite: ["sqlite"],
  Prisma: ["prisma", "призма"],
  Drizzle: ["drizzle"],

  // DevOps & Infrastructure
  Docker: ["docker", "докер"],
  Kubernetes: ["kubernetes", "k8s", "кубер"],
  AWS: ["aws", "amazon web services"],
  GCP: ["gcp", "google cloud"],
  Azure: ["azure", "азур"],
  Vercel: ["vercel"],
  Netlify: ["netlify"],
  "CI/CD": ["ci/cd", "cicd", "ci cd", "github actions", "gitlab ci"],

  // Tools
  Git: ["git", "гит"],
  GitHub: ["github", "гитхаб"],
  GitLab: ["gitlab", "гитлаб"],
  VSCode: ["vscode", "vs code", "visual studio code"],
  Vim: ["vim", "neovim", "nvim"],
  Webpack: ["webpack", "вебпак"],
  Vite: ["vite", "вайт"],
  ESLint: ["eslint"],
  Prettier: ["prettier"],

  // Testing
  Jest: ["jest", "джест"],
  Vitest: ["vitest"],
  Playwright: ["playwright"],
  Cypress: ["cypress"],
  Testing: ["testing", "тестирование", "tests", "тесты"],

  // AI/ML
  "AI/ML": ["ai", "ml", "machine learning", "искусственный интеллект", "нейросет"],
  OpenAI: ["openai", "chatgpt", "gpt", "gpt-4", "gpt-3"],
  LLM: ["llm", "large language model"],
  TensorFlow: ["tensorflow"],
  PyTorch: ["pytorch"],

  // Mobile
  "React Native": ["react native", "rn"],
  Flutter: ["flutter", "флаттер"],
  iOS: ["ios", "swift", "swiftui"],
  Android: ["android", "андроид"],

  // Concepts
  API: ["api", "rest", "graphql", "grpc", "апи"],
  GraphQL: ["graphql", "граф"],
  WebSocket: ["websocket", "ws", "вебсокет"],
  SSR: ["ssr", "server side rendering"],
  SSG: ["ssg", "static site generation"],
  Microservices: ["microservices", "микросервис"],
  Monorepo: ["monorepo", "монорепо"],
  Security: ["security", "безопасность", "auth", "аутентификация"],
  Performance: ["performance", "производительность", "оптимизация"],
};

/**
 * Извлечение тем из текстового контента
 */
export function extractTopicsFromContent(content: string): string[] {
  const lowerContent = content.toLowerCase();
  const foundTopics = new Set<string>();

  // Проходим по известным темам
  for (const [topic, aliases] of Object.entries(KNOWN_TOPICS)) {
    for (const alias of aliases) {
      // Проверяем наличие алиаса как отдельного слова
      const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
      if (regex.test(lowerContent)) {
        foundTopics.add(topic);
        break;
      }
    }
  }

  // Также добавляем сам topic если он встречается напрямую
  for (const topic of Object.keys(KNOWN_TOPICS)) {
    const regex = new RegExp(`\\b${escapeRegExp(topic)}\\b`, "i");
    if (regex.test(content)) {
      foundTopics.add(topic);
    }
  }

  // Ограничиваем количество тем
  const topicsArray = Array.from(foundTopics);

  // Сортируем по частоте упоминания
  topicsArray.sort((a, b) => {
    const countA = countOccurrences(lowerContent, a.toLowerCase());
    const countB = countOccurrences(lowerContent, b.toLowerCase());
    return countB - countA;
  });

  return topicsArray.slice(0, 7);
}

/**
 * Извлечение тем из массива постов
 */
export function extractTopicsFromPosts(
  posts: Array<{ title: string | null; content: string }>
): string[] {
  const allContent = posts.map((p) => `${p.title || ""} ${p.content}`).join(" ");
  return extractTopicsFromContent(allContent);
}

/**
 * Подсчет вхождений строки
 */
function countOccurrences(text: string, search: string): number {
  const regex = new RegExp(`\\b${escapeRegExp(search)}\\b`, "gi");
  return (text.match(regex) || []).length;
}

/**
 * Экранирование специальных символов для регулярного выражения
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Нормализация названия темы
 */
export function normalizeTopic(topic: string): string {
  const lowerTopic = topic.toLowerCase().trim();

  for (const [normalizedName, aliases] of Object.entries(KNOWN_TOPICS)) {
    if (normalizedName.toLowerCase() === lowerTopic) {
      return normalizedName;
    }
    for (const alias of aliases) {
      if (alias.toLowerCase() === lowerTopic) {
        return normalizedName;
      }
    }
  }

  // Если тема не найдена в словаре, возвращаем как есть с заглавной буквы
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

/**
 * Получение связанных тем
 */
export function getRelatedTopics(topic: string): string[] {
  const relations: Record<string, string[]> = {
    React: ["Next.js", "TypeScript", "JavaScript", "Redux"],
    "Next.js": ["React", "TypeScript", "Vercel", "SSR"],
    Vue: ["Nuxt", "TypeScript", "JavaScript"],
    TypeScript: ["JavaScript", "Node.js", "React"],
    "Node.js": ["JavaScript", "TypeScript", "Express", "NestJS"],
    Docker: ["Kubernetes", "DevOps", "CI/CD"],
    PostgreSQL: ["Prisma", "Database", "SQL"],
    Python: ["Django", "FastAPI", "AI/ML"],
  };

  return relations[topic] || [];
}

/**
 * Проверка, является ли строка известной темой
 */
export function isKnownTopic(topic: string): boolean {
  const lowerTopic = topic.toLowerCase();

  for (const [name, aliases] of Object.entries(KNOWN_TOPICS)) {
    if (name.toLowerCase() === lowerTopic || aliases.includes(lowerTopic)) {
      return true;
    }
  }

  return false;
}
