import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useState, useEffect } from "react";
import CompanyTable from "./components/CompanyTable";
import { checkTaskInProgress, getCollectionsMetadata, ICollection, TaskInProgressResponse } from "./utils/jam-api";
import useApi from "./utils/useApi";
import { Alert, Button, LinearProgress, Snackbar } from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    button: {
      textTransform: 'none',
    },
  },
});

interface ProgressMessage {
  progress: number;
  status: string;
  total: number;
  message: string;
}

function App() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [allCollections, setAllCollections] = useState<ICollection[]>([]);
  const { data: collectionResponse } = useApi(() => getCollectionsMetadata());
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showProgressSnackbar, setShowProgressSnackbar] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<ProgressMessage>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    checkTaskInProgress().then((response: TaskInProgressResponse) => {
      if (response.task_id) {
        setTaskId(response.task_id);
        setShowProgressSnackbar(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.hostname}:8000/ws/progress/${taskId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      const data: ProgressMessage = JSON.parse(event.data);
      setProgressMessage(data);
      setShowProgressSnackbar(true);

      if (data.status === 'completed' || data.progress >= 1) {
        socket.close();
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setShowProgressSnackbar(false);
      setError('WebSocket error');
    };

    return () => {
      socket.close();
    };
  }, [taskId]);


  useEffect(() => {
    getCollectionsMetadata().then((collections) => {
      setAllCollections(collections);
      console.log(collections);
    });
  }, []);

  useEffect(() => {
    setSelectedCollectionId(collectionResponse?.[0]?.id);
    console.log(collectionResponse);
  }, [collectionResponse]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="mx-8">
        <div className="font-bold text-xl border-b p-2 mb-4 text-left">
          Harmonic Jam
        </div>
        <div className="flex">
          <div className="w-1/5">
            <p className=" font-bold border-b pb-2">Collections</p>
            <div className="flex flex-col gap-2">
              {collectionResponse?.map((collection) => {
                return (
                  <div
                    className={`py-1 hover:cursor-pointer hover:bg-orange-300 ${selectedCollectionId === collection.id &&
                      "bg-orange-500 font-bold"
                      }`}
                    onClick={() => {
                      setSelectedCollectionId(collection.id);
                    }}
                  >
                    {collection.collection_name}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-4/5 ml-4">
            {selectedCollectionId && (
              <CompanyTable
                selectedCollectionId={selectedCollectionId}
                allCollections={allCollections}
              />
            )}
          </div>
        </div>
        {progressMessage && <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={showProgressSnackbar}
          onClose={() => setShowProgressSnackbar(false)}
        >
          {progressMessage?.status === 'in_progress' && progressMessage?.progress < 1 ? (
            <Alert severity="info" >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'column' }}>
                {progressMessage?.message}
                <div>
                  <LinearProgress variant="determinate" value={progressMessage?.progress * 100} />
                  {(progressMessage?.progress * 100).toFixed(2)}% completed
                </div>
              </div>
            </Alert>
          ) : (
            <Alert
              severity="success"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.location.reload()}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
              }
            >
              {progressMessage?.message}
            </Alert>
          )}
        </Snackbar>}

        {error && <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={true}
          onClose={() => setError(null)}
        >
          <Alert severity="error">{error}</Alert>
        </Snackbar>}
      </div>
    </ThemeProvider>
  );
}

export default App;
