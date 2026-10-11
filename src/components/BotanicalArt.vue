<script setup>
defineProps({ variant: { type: String, default: "leaves" } });
</script>
<template>
  <svg
    v-if="variant === 'leaves'"
    viewBox="0 0 250 180"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M122 182C125 134 139 93 177 44M121 160C102 129 80 108 57 87M137 119C162 115 186 103 204 81"
      stroke="var(--art-stem)"
      stroke-width="2"
    />
    <path
      d="M151 84C126 82 128 50 151 27C166 53 163 71 151 84Z"
      fill="var(--art-leaf)"
    />
    <path
      d="M165 62C162 34 187 24 207 23C204 44 188 64 165 62Z"
      fill="var(--art-leaf-dark)"
    />
    <path
      d="M136 116C112 104 108 83 119 60C143 75 149 98 136 116Z"
      fill="var(--art-leaf-light)"
    />
    <path
      d="M138 114C148 89 176 88 194 94C178 118 157 122 138 114Z"
      fill="var(--art-leaf)"
    />
    <path
      d="M115 152C96 147 82 130 85 109C107 110 126 126 115 152Z"
      fill="var(--art-leaf-dark)"
    />
    <path
      d="M85 118C66 121 48 108 39 83C66 80 84 95 85 118Z"
      fill="var(--art-leaf-light)"
    />
    <path
      d="M168 108C166 86 182 69 207 65C208 88 191 108 168 108Z"
      fill="var(--art-leaf-light)"
    />
    <circle cx="52" cy="44" r="3" fill="var(--art-gold)" />
    <circle cx="218" cy="125" r="4" fill="var(--art-gold)" />
  </svg>
  <svg
    v-else-if="variant === 'tea'"
    viewBox="0 0 250 180"
    fill="none"
    aria-hidden="true"
  >
    <ellipse cx="125" cy="144" rx="76" ry="13" fill="var(--art-ground)" />
    <path
      d="M72 80H164V112C164 142 82 145 76 114L72 80Z"
      fill="var(--art-cup)"
    />
    <ellipse cx="118" cy="80" rx="46" ry="10" fill="var(--art-cup-rim)" />
    <ellipse cx="118" cy="81" rx="38" ry="6" fill="var(--art-drink)" />
    <path
      d="M166 87C201 79 205 119 169 120"
      stroke="var(--art-cup)"
      stroke-width="11"
    />
    <path
      d="M107 61C90 45 121 39 106 21M129 61C114 45 143 35 130 19"
      stroke="var(--art-highlight)"
      stroke-width="3"
      stroke-linecap="round"
    />
    <path
      d="M47 151C49 124 43 112 25 106M45 137C30 139 20 129 20 120C35 118 45 125 45 137M46 128C43 112 53 104 61 98C66 113 59 124 46 128"
      fill="var(--art-leaf)"
    />
  </svg>
  <svg v-else viewBox="0 0 250 180" fill="none" aria-hidden="true">
    <circle cx="167" cy="58" r="27" fill="var(--art-sun)" />
    <path
      d="M0 141C50 102 77 147 118 118C161 87 185 111 250 94V180H0Z"
      fill="var(--art-landscape-muted)"
    />
    <path
      d="M0 158C54 129 86 169 143 139C186 116 226 139 250 132V180H0Z"
      fill="var(--art-landscape)"
    />
    <path
      d="M88 180C97 156 133 149 128 134C123 123 125 119 139 116"
      stroke="var(--art-landscape-line)"
      stroke-width="11"
    />
    <path
      d="M43 123V67M43 87L27 76M43 101L62 83"
      stroke="var(--art-stem)"
      stroke-width="3"
    />
    <ellipse
      cx="28"
      cy="71"
      rx="12"
      ry="20"
      transform="rotate(-30 28 71)"
      fill="var(--art-leaf)"
    />
    <ellipse
      cx="59"
      cy="79"
      rx="12"
      ry="19"
      transform="rotate(40 59 79)"
      fill="var(--art-leaf)"
    />
  </svg>
</template>
