/**
 * Copy this code and paste it in the browser console on the frontend page
 * It will help us diagnose the theme loading issue
 */

console.log('=== THEME DEBUG TEST ===');
console.log('1. window.qe_data exists?', !!window.qe_data);

if (window.qe_data) {
    console.log('2. window.qe_data:', window.qe_data);
    console.log('3. window.qe_data.theme:', window.qe_data.theme);
    console.log('4. typeof theme:', typeof window.qe_data.theme);
    
    if (window.qe_data.theme) {
        console.log('5. theme.light exists?', !!window.qe_data.theme.light);
        console.log('6. theme.dark exists?', !!window.qe_data.theme.dark);
        console.log('7. theme.light:', window.qe_data.theme.light);
        console.log('8. theme.dark:', window.qe_data.theme.dark);
    } else {
        console.error('❌ window.qe_data.theme is undefined or null!');
    }
    
    console.log('9. scoreFormat:', window.qe_data.scoreFormat);
    console.log('10. isDarkMode:', window.qe_data.isDarkMode);
} else {
    console.error('❌ window.qe_data is not defined!');
    console.log('Available global variables:', Object.keys(window).filter(k => k.includes('qe') || k.includes('QE')));
}

// Test if ThemeContext is working
setTimeout(() => {
    const root = document.documentElement;
    console.log('11. CSS Variables applied:');
    console.log('  --qe-primary:', getComputedStyle(root).getPropertyValue('--qe-primary'));
    console.log('  --qe-secondary:', getComputedStyle(root).getPropertyValue('--qe-secondary'));
    console.log('  --qe-background:', getComputedStyle(root).getPropertyValue('--qe-background'));
    console.log('  --qe-text:', getComputedStyle(root).getPropertyValue('--qe-text'));
}, 1000);

console.log('=== END DEBUG ===');
