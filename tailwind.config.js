/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 使用 class 模式进行主题切换
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 颜色映射到 style.css 中的设计令牌（深浅主题自动切换）
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        bg3: 'var(--bg3)',
        ink: 'var(--text)',
        ink2: 'var(--text2)',
        ink3: 'var(--text3)',
        line: 'var(--border)',
        line2: 'var(--border2)',
        card: {
          DEFAULT: 'var(--card)',
          hover: 'var(--card-h)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          deep: 'var(--accent2)'
        }
      },
      borderRadius: {
        token: 'var(--radius)',
        'token-sm': 'var(--radius-sm)'
      },
      boxShadow: {
        'token-s': 'var(--shadow-s)',
        'token-m': 'var(--shadow-m)',
        'token-l': 'var(--shadow-l)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out'
      }
    }
  },
  plugins: []
}
