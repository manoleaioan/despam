import React, { useState, useEffect, useRef } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import './App.css';

function App() {
  const [emails, setEmails] = useState([]);  // Store fetched emails
  const [nextPageToken, setNextPageToken] = useState(null);  // Track the nextPageToken
  const [pageTokenList, setPageTokenList] = useState({ "0": null })
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentPage = useRef(0);
  const [rowCount, setRowCount] = useState(0);

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  // Fetch emails when component mounts or page changes
  useEffect(() => {
    fetchEmails();
  }, []);  // Fetch emails on page change

  const fetchEmails = async (pageToken) => {
    setLoading(true);
    try {
      // Make the request to fetch spam emails (with pagination)
      const result = await window.electronAPI.getSpamEmails(pageToken);

      // Fetch details for each message
      const emailDetails = await Promise.all(
        result.messages.map((msg) => window.electronAPI.getEmailDetails(msg.id))
      );

      // Update row count
      setRowCount(result.totalEmails);

      // Set the email data and pagination tokens
      setEmails(emailDetails);

      if (result.nextPageToken) {
        setPageTokenList((t) => ({
          ...t,
          [currentPage.current + 1]: result.nextPageToken
        }));
      }

      setNextPageToken(result.nextPageToken);  // Update nextPageToken for pagination
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails. Please re-authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    let next = newPage.page > currentPage.current;
    currentPage.current = newPage.page;

    console.log(newPage.page, currentPage.current)
    if (next) {
      fetchEmails(nextPageToken);
    } else {
      fetchEmails(pageTokenList[newPage.page]);
    }
  };

  const columns = [
    { field: 'from', headerName: 'Sender', flex: 1 },
    { field: 'subject', headerName: 'Subject', flex: 1 },
    { field: 'date', headerName: 'Date', flex: 1 },
    { field: 'unsubscribeLink', headerName: 'UnsubscribeLink', flex: 1 },
  ];

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className='App'>
        <Box sx={{ height: 600, padding: 2 }}>
          <h1>Spam Emails</h1>

          {/* {Object.entries(pageTokenList).map(([key, value], index) => (
            <p key={index}>{key}: {value}</p>
          ))} */}

          {error && <Alert severity="error">{error}</Alert>}
          <DataGrid
            rows={emails}
            columns={columns}
            pageSize={50}
            pageSizeOptions={[50]}
            paginationMode="server"
            onPaginationModelChange={(model) => handlePageChange(model)}
            rowCount={((Object.entries(pageTokenList).length)*50)}
            loading={loading}
            getRowId={(row) => row.id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 50, page: 0 }
              }
            }}
          />
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default App;
