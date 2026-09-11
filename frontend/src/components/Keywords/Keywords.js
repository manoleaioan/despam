import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import JSON5 from 'json5';
import { motion } from "framer-motion";

import "./Keywords.scss";

function Keywords() {
  const navigate = useNavigate();

  const [keywords, setKeywords] = useState(null);

  useEffect(() => {
    async function fetchKeywords() {
      try {
        const data = await window.electronAPI.getKeywords();
        setKeywords(data);
      } catch (err) {
        console.error('Failed to fetch keywords:', err);
      }
    }

    fetchKeywords();
  }, []);


  const handleSave = async() => {
    try {
      const parsed = JSON5.parse(keywords); // Validate before saving
      await window.electronAPI.saveKeywords(keywords);
      alert('Saved successfully!');
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <motion.div className='keywords-container' initial={{ y:-50, opacity: 0.2 }} animate={{y:0, opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="header">
        <div className="inner">
          <Button startIcon={<SaveIcon />} className='btn' sx={{ maxWidth: '140px' }} onClick={handleSave}>
            Save
          </Button>
          <Button startIcon={<CloseIcon />} className='btn outline' sx={{ maxWidth: '70px' }} onClick={() => navigate('/app', { replace: true })} />
        </div>
      </div>

      <div className="keyword-settings">
        <div className="keyword-group">
          {/* <h3 className="keyword-title">Unsubscribe Success Keywords</h3>
          <p className="keyword-description">
            These keywords are used to detect if the unsubscribe process was successful.
            The bot looks for phrases that confirm the user has been unsubscribed.
          </p> */}
          {/* <textarea className="keyword-input" defaultValue={keywords?.unsubSuccessKeywords.join('\n')} /> */}

          <Editor
            className="keyword-input"
            height="80vh"
            defaultLanguage="javascript"
            value={keywords}
            onChange={(val) => setKeywords(val)}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              // Disable editor suggestions and quick suggestions
              quickSuggestions: false,
              // Disable parameter hints
              parameterHints: { enabled: false },
              // Disable other editor options you don't want
              suggestOnTriggerCharacters: false,
              acceptSuggestionOnEnter: 'off',
              // Disable error squiggles in editor
              // (JSON validation is disabled above, so no squiggles)
              wordWrap: true,
            }}
          />
        </div>

        {/* <div className="keyword-group">
          <h3 className="keyword-title">Unsubscribe Success Keywords</h3>
          <p className="keyword-description">
            These keywords are used to detect if the unsubscribe process was successful.
            The bot looks for phrases that confirm the user has been unsubscribed.
          </p>
          <textarea className="keyword-input" defaultValue={keywords?.unsubSuccessKeywords} />
        </div>

        <div className="keyword-group">
          <h3 className="keyword-title">Unsubscribe Success Keywords</h3>
          <p className="keyword-description">
            These keywords are used to detect if the unsubscribe process was successful.
            The bot looks for phrases that confirm the user has been unsubscribed.
          </p>
          <textarea className="keyword-input" defaultValue={keywords?.unsubSuccessKeywords} />
        </div> */}
      </div>

    </motion.div>
  );
}

export default Keywords;