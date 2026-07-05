---
title: Frappe Framework
outline: false
aside: false
---

<script setup>
import { useRouter, withBase } from 'vitepress'
import { onMounted } from 'vue'

const router = useRouter()
onMounted(() => router.go(withBase('/getting-started/introduction')))
</script>

Redirecting to [Introduction](./getting-started/introduction)...
