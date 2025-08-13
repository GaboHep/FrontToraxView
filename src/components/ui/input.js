export function Input(props) {
  return (
    <input
      {...props}
      className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-300"
    />
  );
}