export const formatDateTime = (isoString, includeTime = true) => {
    if (!isoString) return 'N/A';
    
    const options = { 
        dateStyle: 'medium' 
    };
    // Only add timeStyle if includeTime is true
    if (includeTime) {
        options.timeStyle = 'short';
    }
    return new Date(isoString).toLocaleString('en-IN', options);
};