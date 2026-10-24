<script setup>
import { ref } from "vue";
import Icon from "../AppIcon.vue";
import BotanicalArt from "../BotanicalArt.vue";
import { articles } from "../../lib/content.js";
import { useDialog } from "../../composables/useDialog.js";

// Opens on one guide when given an article, otherwise on the list of guides.
const props = defineProps({ article: { type: Object, default: null } });
const { focusDialog } = useDialog();
const selected = ref(props.article);
function openArticle(article) {
  selected.value = article;
  focusDialog();
}
</script>

<template>
  <template v-if="selected">
    <div class="modal-article-art" :class="selected.color">
      <BotanicalArt :variant="selected.art" />
    </div>
    <span class="eyebrow">{{ selected.tag }}</span>
    <h2 id="modal-title">{{ selected.title }}</h2>
    <p class="article-body">{{ selected.body }}</p>
    <a
      class="source-link"
      :href="selected.source"
      target="_blank"
      rel="noopener noreferrer"
      >{{ selected.sourceName }} <Icon name="ArrowUpRight" :size="14"
    /></a>
  </template>
  <template v-else>
    <span class="eyebrow">THE LITTLE THINGS</span>
    <h2 id="modal-title">A softer kind of self-care.</h2>
    <p>A few gentle reads, whenever you need them.</p>
    <button
      v-for="article in articles"
      :key="article.title"
      class="library-item"
      @click="openArticle(article)"
    >
      <div class="library-art" :class="article.color">
        <BotanicalArt :variant="article.art" />
      </div>
      <div>
        <h3>{{ article.title }}</h3>
        <p>{{ article.time }}</p>
      </div>
      <Icon name="ArrowUpRight" :size="18" />
    </button>
  </template>
</template>
