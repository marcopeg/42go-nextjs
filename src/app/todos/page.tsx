import { pageWithConfig } from "@/lib/config/app-config-pages";

export default async function TodosPage() {
  return pageWithConfig(
    (config) => (
      <main className="p-8 dark:bg-gray-900 dark:text-white">
        <h1 className="text-2xl font-bold mb-4">Todos for {config.name}</h1>
        <p className="text-gray-600 dark:text-gray-300">
          This is the todos page. (You can wire up the API here!)
        </p>
      </main>
    ),
    "TodosPage"
  );
}
