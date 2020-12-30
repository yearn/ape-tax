<template lang="pug">
#home
  h1 ytVaults Registry
  div.row
    div.column.warning ⚠️ <strong>WARNING</strong> this vaults are experimental. They are extremely risky and will probably be discarded when production ones are deployed. Proceed with caution.
  div.spacer
  div 
    ul(v-for="(vault, key) in allConfig")
      li 
        a( class="links" :href="'/' + key") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
</template>

<script>

import { mapGetters } from "vuex";

export default {
  name: "Home",
  components: {},
  props: ['allConfig'],
  data() {
    return {
    };
  },
  filters: {},
  methods: {},
  computed: {},
  created() {
  },
}
</script>

<style>
ul {
  list-style-type: none;
  padding-left: 0.5em;
  padding-bottom: 0.5em;
}
a.links,
a.links:visited,
a.links:hover {
  font-family: IBM Plex Mono,monospace;
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
  text-decoration: none;
}
a.links:hover span.text {
  border-bottom: 1px dotted red;
}
.muted {
  color: gray;
  font-size: 0.8em;
}
.red {
  color: red;
  font-weight: 700;
}
.blue {
  color: blue;
  font-weight: 700;
}
.spacer {
  padding-top: 1em;
  padding-bottom: 1em;
}
</style>