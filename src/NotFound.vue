<template lang="pug">
#notFound
  div(class="notFound")
    p 😵
    p Page Not Found
    p 404
</template>

<script>

import { mapGetters } from "vuex";

export default {
  name: "NotFound",
  components: {},
  props: [],
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
div.notFound {
	width: 400px;
	height: 200px;
	margin: auto;
  text-align: center;
  font-size: 3em;
}
</style>