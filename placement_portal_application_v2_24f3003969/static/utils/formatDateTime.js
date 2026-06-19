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

export const getMinDate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const getMinDateTime = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};