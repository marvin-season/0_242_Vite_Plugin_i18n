import "./App.css";

enum Colors {
  key1 = "中文文本",
  "中文Key" = "中文文本",
}

function App() {
  const text = "中文文本";
  const text2 = `${text} | 中文文本`;

  return (
    <>
      <div>{"中文文本"}</div>
      <div>中文文本</div>
      <div>{text}</div>
      <div>{text2}</div>
      <input type="text" value="中文文本" />
      <div>{Colors.key1}</div>
      <div>{Colors.中文Key}</div>
    </>
  );
}

export default App;
