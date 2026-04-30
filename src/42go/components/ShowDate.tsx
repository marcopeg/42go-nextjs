export const ShowDate = ({ date }: { date: string }) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default ShowDate;
