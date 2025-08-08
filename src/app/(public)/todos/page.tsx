import { appPage } from "@/42go/config/app-config-pages";

const TodosPage = () => {
  return (
    <main className="p-8 dark:bg-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Todos</h1>
      <p className="text-gray-600 dark:text-gray-300">
        This is the todos page. (You can wire up the API here!)
      </p>
    </main>
  );
};

export default appPage(TodosPage, "todos");
