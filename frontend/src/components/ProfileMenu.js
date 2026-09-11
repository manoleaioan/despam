import { useState } from 'react';
import { Box, Avatar, Typography, Menu, MenuItem } from '@mui/material';

export const ProfileMenu = ({ userInfo }) => {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleProfileClick = (event) => {
        setAnchorEl(event.currentTarget); // Set the anchorEl to the clicked element
    };

    const handleClose = () => {
        setAnchorEl(null);
    };


    const handleLogout = async () => {
        try {
            const result = await window.electronAPI.logout();
            if (result.success) {
                window.location.reload();
            } else {
                console.error(result.message, result.error);
            }
        } catch (error) {
            console.error('Unexpected error during logout:', error);
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{
                // display: 'flex', alignItems: 'center', cursor: 'pointer',
                // border: '1px solid #272727', padding: 1,
                // boxSizing: 'border-box', borderRadius: 5
                position:"absolute",
                top:'10px',
                right:'10px'
            }}
                onClick={handleProfileClick}>
                <Avatar
                    alt={userInfo.name}
                    src={userInfo.picture}
                    sx={{
                        width: 56,
                        height: 56,
                        marginRight: 2,
                    }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {/* <Typography variant="h6">{userInfo.name}</Typography>
                    <Typography variant="body2" color="text.secondary" style={{ marginTop: -4 }}>
                        {userInfo.email}
                    </Typography> */}
                </Box>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                <MenuItem onClick={handleLogout}>Log Out</MenuItem>
            </Menu>
        </Box>
    );
};
