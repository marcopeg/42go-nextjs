import { protectPage } from "@/42go/policy/protectPage";

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

export default protectPage(TodosPage, [
  {
    require: { feature: "page:todos" },
  },
  // {
  //   require: { session: true },
  //   // onFail: { redirect: "/login" },
  // },
  // {
  //   require: { role: "fooo" },
  //   onFail: {
  //     code: "Forbidden!",
  //     message: "You do not have permission to access this page!!!",
  //   },
  // },
]);
