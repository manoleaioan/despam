import React, { useState, useEffect, useRef } from 'react';
import { DataGrid, GridCloseIcon, GridMoreVertIcon } from '@mui/x-data-grid';
import { Box, Alert, Button, Tooltip, Menu, MenuItem, IconButton, FormGroup, FormControlLabel, Switch, LinearProgress, Checkbox, CircularProgress, duration } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { green, pink } from '@mui/material/colors';
import classNames from 'classnames';
import { ProfileMenu } from '../../components/ProfileMenu';
import testEmailsJson from '../../testEmails.json';
import Logo from '../../assets/logo.png';
import Spinner from '../../assets/spinner.svg';
import Spinner2 from '../../assets/spinner2.png';
import "./MainApp.scss";
import zIndex from '@mui/material/styles/zIndex';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import AnimatedNumber from '../animated-number/AnimatedNumber';
import { motion } from "framer-motion";
import useConfig from '../../hooks/useConfig';

function MainApp() {
  const navigate = useNavigate();

  const useTestData = false;
  const [maxResults, setMaxResults] = useState(50);
  const testEmails = testEmailsJson?.slice(0, maxResults);
  const [emails, setEmails] = useState([]);
  const emailsRef = useRef([]);
  const nextPageTokenRef = useRef(null);
  const [totalSpam, setTotalSpam] = useState(0);
  const totalSpamRef = useRef(0);
  const [pageTokenList, setPageTokenList] = useState({ "0": null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentPageRef = useRef(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const webviewRef = useRef(null);
  const startBotRef = useRef(false);
  const [startBot, setStarBot] = useState(false);
  const [progress, setProgress] = React.useState(0);

  const showUnsubscribeLink = false;
  const showActions = false;
  const columns = [
    {
      field: 'status',
      headerName: '',
      sortable: false,
      flex: 0.3,
      renderCell: (params) => renderStatusCell(params),
    },
    { field: 'from', headerName: 'Sender', flex: 1 },
    { field: 'subject', headerName: 'Subject', flex: 1 },
    {
      field: 'date',
      headerName: 'Date',
      flex: 1,
      renderCell: (params) => renderDateCell(params),
    },
    ...(showUnsubscribeLink
      ? [{ field: 'unsubscribeLink', headerName: 'Unsubscribe Link', flex: 1 }]
      : []),
    ...(showActions
      ? [
        {
          field: 'actions',
          headerName: 'Actions',
          sortable: false,
          flex: 0.3,
          renderCell: (params) => <RowOptionsMenu row={params.row} />,
        },
      ]
      : []),
  ];

  const [config, setConfig] = useConfig({
    autoNextMail: true,
    autoLoadMails: true,
    debugMode: false,
    deleteSuccessUnsubscribe: true,
    deleteFailureUnsubscribe: false
  });

  const configRef = useRef(config);
  const [emailIndex, setEmailIndex] = useState(0);
  const emailIndexRef = useRef(0);
  const totalEmailIndexRef = useRef(0);
  const [totalEmailIndex, setTotalEmailIndex] = useState(0);
  const [unsubSuccessCount, setUnsubSuccessCount] = useState(0);
  const [preloadPath, setPreloadPath] = useState('');
  const [ready, setReady] = useState(false);


  useEffect(() => {
    if (testEmails && useTestData) {
      setEmails(testEmails)
    } else {
      fetchEmails();
    }

    getUserProfile()
      .then((data) => { setUserInfo(data) })
      .catch((err) => console.error('Error fetching user info', err));

    if (testEmails && useTestData) {
      totalSpamRef.current = testEmailsJson.length;
      setTotalSpam(totalSpamRef.current);
    } else {
      getTotalSpamCount();
    }

    const webview = webviewRef.current;

    webview.addEventListener("dom-ready", function () {
      setReady(true);
    });

    const ipcMessageHandler = (event) => {
      if (event.channel === 'unsubscribe') {
        onUnsubscribed(event.args[0]);
      }
    };

    webview.addEventListener('ipc-message', ipcMessageHandler);

    webview.addEventListener('dom-ready', () => {
      setReady(true);
    });

    window.addEventListener('error', (e) => {
      console.error('[webviewPreload] Error:', e.message, e.filename, e.lineno);
    });

    webview.addEventListener('console-message', (e) => {
      console.log('[webview LOG]', e.message);
    });

    webview.addEventListener('DOMContentLoaded', () => {

    })

    window.electronAPI
      .getPreloadPath()
      .then((path) => setPreloadPath(path))
      .catch((err) => console.error('Failed to fetch preload path:', err));

    // App links break the execution, so resume
    webview.addEventListener('will-navigate', (event) => {
      const url = event.url;

      if (!(url.startsWith('http://') || url.startsWith('https://'))) {
        onUnsubscribed({ success: false, url: '' })
        console.warn(`Blocked app-specific link: ${url}`);
      }
    });

    return () => {
      webview.removeEventListener('ipc-message', ipcMessageHandler);
    };
  }, []);

  useEffect(() => {
    emailsRef.current = emails;
  }, [emails])

  useEffect(() => {
    if (ready && userInfo) {
      webviewRef.current.send("set-email", userInfo.email);
    }
  }, [ready, userInfo, preloadPath])

  useEffect(() => {
    if (preloadPath) {
      webviewRef.current.src = 'about:blank'
    }
  }, [preloadPath])

  useEffect(() => {
    configRef.current = config;
  }, [config])

  function RowOptionsMenu({ row }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const handleDelete = () => {
      handleMenuClose();
      deleteEmails(row.id);
    };

    const handleBlock = () => {
      handleMenuClose();
      blockSender(row.from);
    };

    return (
      <>
        <Tooltip title="Options">
          <IconButton onClick={handleMenuClick}>
            <GridMoreVertIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleDelete}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
          <MenuItem onClick={handleBlock}>
            <BlockIcon sx={{ mr: 1 }} />
            Block Sender
          </MenuItem>
        </Menu>
      </>
    );
  }

  const renderStatusCell = (params) => {
    const index = params.api.getRowIndexRelativeToVisibleRows(params.id);

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
        className="status"
      >
        {params.row.unsubscribeLink === 'N/A' ? (
          <Tooltip title="Unsubscribe url not found">
            <InfoOutlineIcon />
          </Tooltip>
        ) : params.row.unsubscribed == null ? (
          index === emailIndexRef.current - 1 ? (
            <CircularProgress className="spinner" />
          ) : (
            <UnsubscribeIcon />
          )
        ) : params.row.unsubscribed ? (
          <Tooltip title="Unsubscribed">
            <UnsubscribeIcon className="accent" />
          </Tooltip>
        ) : (
          <Tooltip title="Could not unsubscribe">
            <InfoOutlineIcon />
          </Tooltip>
        )}
      </Box>
    );
  };

  const renderDateCell = (params) => {
    const rawDate = params.value;
    if (!rawDate) return null;

    const date = new Date(rawDate.trim());
    if (isNaN(date.getTime())) return <>Invalid Date</>;

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);

    return <span>{formattedDate}</span>;
  };

  const getUserProfile = async () => {
    try {
      const result = await window.electronAPI.getUserProfile();
      return result;
    } catch (err) {
      console.error('Error getting profile:', err);
    }
  }

  const getTotalSpamCount = async () => {
    try {
      const result = await window.electronAPI.getSpamCount();
      totalSpamRef.current = result;
      setTotalSpam(totalSpamRef.current);
      return result;
    } catch (err) {
      console.error('Error total spam count:', err);
    }
  }

  const fetchEmails = async (pageToken) => {
    setLoading(true);
    try {
      // Make the request to fetch spam emails (with pagination)
      const result = await window.electronAPI.getSpamEmails(pageToken, maxResults);

      // Fetch details for each message
      const emailDetails = await Promise.all(
        result.messages.map((msg) => window.electronAPI.getEmailDetails(msg.id))
      );

      console.log(emailDetails)

      if (result.nextPageToken) {
        setPageTokenList((t) => ({
          ...t,
          [currentPageRef.current + 1]: result.nextPageToken
        }));
      }

      if (!result.nextPageToken) {
        alert('no next page')
      }

      nextPageTokenRef.current = result.nextPageToken;  // Update nextPageTokenRef.current for pagination

      // Set the email data and pagination tokens
      setEmails(emailDetails);

      if (startBotRef.current) {
        loadMail();
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails. Please re-authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    let next = newPage.page > currentPageRef.current;
    currentPageRef.current = newPage.page;
    setCurrentPage(currentPageRef.current);
    if (next) {
      fetchEmails(nextPageTokenRef.current);
    } else {
      fetchEmails(pageTokenList[newPage.page]);
    }
  };

  const deleteEmails = async (emailIds) => {
    try {
      // Ensure emailIds is always an array
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : [emailIds];

      const result = await window.electronAPI.deleteEmails(emailIdsArray);

      if (result.success) {
        setEmails((prevEmails) =>
          prevEmails.map((email) =>
            emailIdsArray.includes(email.id) ? { ...email, deleted: true } : email
          )
        );
        // setEmails((prevEmails) =>
        //   prevEmails.filter((email) => !emailIdsArray.includes(email.id))
        // );
      }
    } catch (err) {
      console.error('Error deleting emails:', err);
    }
  };

  const blockSender = async (senderEmail) => {
    try {
      console.log('Sender blocked successfully', senderEmail);
    } catch (error) {
      console.error('Failed to block sender:', error);
    }
  };

  const loadMail = async () => {
    // find and load the next unsubscribe url
    for (let i = emailIndexRef.current; i < emailsRef.current.length; i++) {
      const unsubscribeLink = emailsRef.current[i]?.unsubscribeLink;

      emailIndexRef.current++;
      setEmailIndex(emailIndexRef.current);

      totalEmailIndexRef.current++;
      setTotalEmailIndex(totalEmailIndexRef.current);

      if (unsubscribeLink && unsubscribeLink !== 'N/A') {
        webviewRef.current.src = unsubscribeLink;
        console.log('\nLoad mail index : ', i, unsubscribeLink);
        return;
      }
    }


    // if not found, and reached the end of the page
    await handleAutoDeleteEmails();
    goNextPage();
  }

  const goNextPage = () => {
    console.log(' GO NEXT', nextPageTokenRef.current)
    if (nextPageTokenRef.current) {
      handlePageChange({ page: currentPageRef.current + 1 })
      emailIndexRef.current = 0;
      setEmailIndex(0);
    } else if (testEmails && useTestData) {

    }
  }

  const startUnsubscribe = () => {
    if (startBotRef.current) {
      handleStop();
    } else {
      startBotRef.current = true;
      emailIndexRef.current = 0;
      totalEmailIndexRef.current = 0;
      setUnsubSuccessCount(0);
      setStarBot(true);
      loadMail();
    }
  }

  const onUnsubscribed = async ({ success, url }) => {
    webviewRef.current.stop();

    if (!startBotRef.current) return;

    setEmails((prevEmails) =>
      prevEmails.map((email, i) =>
        (i === emailIndexRef.current - 1) ? { ...email, unsubscribed: success ? true : false } : email
      )
    );

    if (success) {
      setUnsubSuccessCount(i => i + 1);
    }

    // setProgress((emailIndexRef.current / emailsRef.current.length) * 100);
    setProgress((totalEmailIndexRef.current / totalSpamRef.current) * 100);

    console.log('\Unsub index : ', emailIndexRef.current - 1, ', successKeyword: ', success, ', nextPageTokenRef: ', nextPageTokenRef.current);

    // If we are at the last email
    if (emailIndexRef.current >= emailsRef.current.length) {
      // Auto delete emails
      await handleAutoDeleteEmails();

      // Auto load nex page
      if (configRef.current.autoLoadMails) {
        goNextPage();
      }

      return;
    }

    // Auto load next mail
    if (emailIndexRef.current > 0 && configRef.current.autoNextMail) {
      loadMail();
    }
  }

  const handleAutoDeleteEmails = async () => {
    const cfg = configRef.current;

    if (cfg.deleteFailureUnsubscribe || cfg.deleteSuccessUnsubscribe) {
      let emailsToDelete = emailsRef.current.filter(email =>
        (cfg.deleteSuccessUnsubscribe && email.unsubscribed) ||
        (cfg.deleteFailureUnsubscribe && !email.unsubscribed)
      ).map(email => email.id);

      if (emailsToDelete.length > 0) {
        await deleteEmails(emailsToDelete);
        console.log(`Deleted ${emailsToDelete.length} mails`)
      }
    }
  }

  const handleStop = () => {
    // navigate('/unsubscribe/summary', { state: { unsubscribedCount: unsubSuccessCount } });

    startBotRef.current = false;
    webviewRef.current.stop();
    webviewRef.current.src = 'about:blank';
    emailIndexRef.current = 0;
    totalEmailIndexRef.current = 0;
    setTotalEmailIndex(0);
    setEmailIndex(0);
    setStarBot(false);
  }

  const handleChange = (event) => {
    console.log('set ', event.target.name, event.target.checked);

    let newConfig = {
      ...config,
      [event.target.name]: event.target.checked,
    };


    if (event.target.name === 'debugMode') {
      newConfig.autoNextMail = !event.target.checked;
    }

    setConfig(newConfig);
  };

  const handleNext = () => {
    if (emailIndexRef.current >= emailsRef.current.length) {
      handlePageChange({ page: currentPageRef.current + 1 })
      emailIndexRef.current = 0;
      setEmailIndex(0);
    }
    loadMail();
  }

  return (
    <div className="main">

      {userInfo &&
        <ProfileMenu userInfo={userInfo} />
      }

      {!(startBot && config.debugMode) &&

        <motion.div className='unsubscribe-ui-circle' initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} layout>
          <motion.div className={classNames({ 'border': !startBot }, 'circle-inside')} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} layout>
            <img src={Logo} alt="Logo" className='logo' />
            <div className="counter">

              {
                startBot ? <>
                  <motion.img src={Spinner} alt="spinner" className='spinner' initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} />
                  <div className='percentage'>{Math.round(progress)}<span className='symbol'>%</span></div>
                  <span className='progress'>{totalEmailIndex} / {totalSpam}</span>
                </>
                  : <>
                    {<AnimatedNumber value={totalSpam} />}
                    <span className='inspam'>in spam</span>
                  </>
              }

            </div>

          </motion.div>
        </motion.div>
      }

      {
        !(startBot && config.debugMode) &&
        <Button className={classNames({ 'text-dark': startBot }, 'btn')} onClick={startUnsubscribe}
        // startIcon={startBot ? <PauseIcon /> : <PlayArrowIcon />}
        >
          {startBot ? "Stop unsubscribing" : "Start unsubscribe"}
        </Button>
      }

      {
        !startBot && <span className='keywords' onClick={() => navigate('/keywords', { replace: true })}>keywords settings</span>
      }

      {
        !startBot && config &&
        <FormGroup className='config'>
          <motion.div className="settings" initial={{ scale: 1 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="option">
              <div className='about'>
                <h1>Delete Unsubscribed</h1>
                <div className='desc'>
                  Remove emails from senders you’ve successfully unsubscribed from
                </div>
              </div>
              <FormControlLabel
                control={
                  <Switch checked={config.deleteSuccessUnsubscribe} onChange={handleChange} name="deleteSuccessUnsubscribe" />
                }
              />
            </div>

            <div className="option">
              <div className='about'>
                <h1>Delete Unsubscribe Failures</h1>
                <div className='desc'>
                  Remove emails that couldn’t be unsubscribed
                </div>
              </div>
              <FormControlLabel
                control={
                  <Switch checked={config.deleteFailureUnsubscribe} onChange={handleChange} name="deleteFailureUnsubscribe" />
                }
              />
            </div>

            <div className="option debug">
              <div className='about'>
                <h1>Debug Mode</h1>
                <div className='desc'>
                  Load one email at a time and preview the webview for testing.
                </div>
              </div>
              <FormControlLabel
                control={
                  <Switch checked={config.debugMode} onChange={handleChange} name="debugMode" />
                }
              />
            </div>
          </motion.div>
        </FormGroup>
      }


      <motion.div
        className={'table-container'}
        style={{ display: 'nonee' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >

        {config.debugMode && startBot &&
          <motion.div
            className='ctrl-btns'
            initial={{ y: "120px" }}
            animate={{ y: '-20px', opacity: config.debugMode && startBot ? 1 : 0 }}
            transition={{ delay: 0.1, duration: 0.3, type: 'easeInOut' }}
          >
            <div className="bg" />

            <div className='info'>
              <CircularProgress variant="determinate" value={100} sx={{ color: '#252525', position: 'absolute', left: 25 }} />
              <CircularProgress variant="determinate" value={Math.round(progress)} className='progress'
                sx={{
                  position: "absolute",
                  left: 25,
                  color: '#64FF86',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              <Button
                variant="contained"
                className='close'
                endIcon={<GridCloseIcon />}
                onClick={handleStop} />

              <div className='values'>
                <span>{totalEmailIndex}</span> / <span>{1200}</span> / <span className='accent'>{unsubSuccessCount}</span>
                <UnsubscribeIcon className="accent" />
              </div>
            </div>

            {(startBot && (!config.autoNextMail || (emailIndexRef.current === emailsRef.current.length && nextPageTokenRef.current)))
              && <Button
                variant="contained"
                className='next'
                endIcon={<NavigateNextIcon />}
                onClick={handleNext} />

            }
          </motion.div>
        }

        {/* {
            startBot ? <>
              <div className='progress-info'>
                <div className='total'>{totalEmailIndex} / {totalSpam} </div>
                <div>Unsubscribed: {unsubSuccessCount}</div>
                <div className='percentage'>{Math.round(progress)}%</div>
              </div>
              <LinearProgress variant="determinate" value={progress} sx={{ width: "100%", height: 6, borderRadius: 10 }} />
            </> :
              <FormGroup className='config'>
                <FormControlLabel
                  control={
                    <Switch checked={config.autoNextMail} onChange={handleChange} name="autoNextMail" />
                  }
                  label="Auto Next Mail"
                />

                <FormControlLabel
                  control={
                    <Switch checked={config.autoLoadMails} onChange={handleChange} name="autoLoadMails" />
                  }
                  label="Auto Load Mails"
                />
              </FormGroup>
          } */}



        {error && <Alert severity="error">{error}</Alert>}



        {(startBot && !config.debugMode) && <>
          <div className="current-stats">
            <Tooltip title="Unsubscribed" className='stat unsub'>
              <UnsubscribeIcon className="accent" /> {unsubSuccessCount}
            </Tooltip>
            <Tooltip title="Could not unsubscribe" className='stat'>
              <InfoOutlineIcon />  {totalEmailIndex - unsubSuccessCount}
            </Tooltip>
          </div>

          <DataGrid
            className={'table'}
            sx={{ maxHeight: 500 }}
            rows={emails}
            columns={columns}
            pageSizeOptions={[50]}
            getRowHeight={() => 50}
            paginationMode="server"
            onPaginationModelChange={(model) => handlePageChange(model)}
            rowCount={totalSpam}
            loading={loading}
            getRowId={(row) => row.id}
            paginationModel={{ pageSize: 50, page: currentPage }}
            checkboxSelection={false}
            disableSelectionOnClick
            onSelectionModelChange={() => { }}
            getRowClassName={(params) =>
              `${params.row.deleted ? 'row-deleted' : ''} ${params.row.unsubscribed ? 'row-unsubscribed' : ''}`.trim()
            }
            disableRowSelectionOnClick
          />
        </>
        }
      </motion.div>

      <motion.div
        animate={{
          // scale:config.debugMode && startBot ? 1 : 0,
          y: config.debugMode && startBot ? 0 : 1000,
          opacity: config.debugMode && startBot ? 1 : 0
        }}
        transition={{ delay: 0, duration: 0.3, type: 'easeInOut' }}

        style={{
          width: '100%',
          height: "100%",
          display: config.debugMode && startBot ? "block" : "none"
        }}
      >
        <webview
          preload={preloadPath}
          ref={webviewRef}
          style={{
            width: '100%',
            height: "100%",
            // borderRadius: '8px',
            backgroundColor: '#fff'
          }}
        ></webview>
      </motion.div>
    </div>

  );
}

export default MainApp;