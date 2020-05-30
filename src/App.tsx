import React, { useState, useRef, useEffect } from "react";
import MonacoEditor from "react-monaco-editor";
import useWebSocket from "react-use-websocket";

function App() {
  const didUnmount = useRef(false);
  const [code, setCode] = useState<string>("");
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    return () => {
      didUnmount.current = true;
    };
  }, []);

  const { sendJsonMessage } = useWebSocket("ws://shaneyu.com:9898/", {
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    shouldReconnect: () => didUnmount.current === false,
    onOpen: () => setCode("WebSocket connected."),
    onMessage: (event: MessageEvent) => {
      const jsonData = JSON.parse(event.data!);

      if (jsonData && jsonData.event === "remoteedit:start") {
        setEditData(jsonData);
        setCode(jsonData.fileContent || "");
      }

      if (
        jsonData &&
        jsonData.event === "remoteedit:cancel" &&
        editData.computerAddress === jsonData.computerAddress
      ) {
        setEditData({});
        setCode("");
      }
    },
  });

  const options = {
    selectOnLineNumbers: true,
    automaticLayout: true,
  };

  const editorDidMount = (editor: { focus: () => void }, monaco: any) => {
    console.log("editorDidMount", editor);
    editor.focus();
  };

  const submitCode = () => {
    sendJsonMessage({
      event: "remoteedit:complete",
      computerAddress: editData.computerAddress,
      fileContent: code,
    });

    setEditData({});
    setCode("");
  };

  return (
    <>
      <div className="flex flex-col h-screen bg-grey-lighter">
        <div className="flex-0 flex  bg-gray-500 px-4 py-2">
          <h1 className="w-auto">OpenComputers Remote Editor</h1>

          <div className="w-auto self-center ml-auto mr-4">
            {!editData.fileName
              ? "Waiting for file..."
              : `Editing file '${editData.fileName}'`}
          </div>

          {editData.fileName && (
            <button className="btn btn-blue mr-4" onClick={submitCode}>
              Submit Changes
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden bg-gray-400 relative">
          <MonacoEditor
            height=""
            width=""
            language="lua"
            theme="vs-dark"
            value={code}
            options={options}
            onChange={setCode}
            editorDidMount={editorDidMount}
          />
        </div>
      </div>
    </>
  );
}

export default App;
