<template>
    <div class="project-panel">
        <n-button type="primary" size="small" @click="handleSelectDirectory">选择项目文件夹</n-button>
        <n-data-table :columns="columns" :data="projects" style="margin-top: 16px;" :pagination="false" size="small" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, h } from "vue";
import { NButton, NInput, NDataTable, useMessage } from "naive-ui";
import { invoke } from "@tauri-apps/api/core";

interface Project {
    alias: string;
    path: string;
    editing?: boolean;
}

const LOCAL_KEY = "githelper-projects";
const projects = ref<Project[]>([]);
const message = useMessage();

const loadProjects = () => {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
        try {
            projects.value = JSON.parse(raw);
        } catch {}
    }
};
const saveProjects = () => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(projects.value));
};

// 选择项目文件夹
const handleSelectDirectory = async () => {
    try {
        const dirPath = (await invoke("select_directory")) as string | null;
        if (dirPath) {
            const alias = dirPath.replace(/\\/g, "/").split("/").pop() || dirPath;
            projects.value.push({ alias, path: dirPath });
            saveProjects();
        }
    } catch (error) {
        console.error("选择目录失败:", error);
        if (error) {
            message.error(error as any);
        } else {
            message.error("选择目录失败");
        }
    }
};

const deleteProject = (index: number) => {
    projects.value.splice(index, 1);
    saveProjects();
};

const startEdit = (row: Project) => {
    row.editing = true;
    setTimeout(() => {
        const input = document.getElementById("edit-alias-" + row.path);
        input && (input as HTMLInputElement).focus();
    }, 0);
};

const finishEdit = (row: Project) => {
    row.editing = false;
    saveProjects();
};

const columns = [
    {
        title: "别名",
        key: "alias",
        render(row: Project, _index: number) {
            if (row.editing) {
                return h(NInput, {
                    id: "edit-alias-" + row.path,
                    value: row.alias,
                    size: "small",
                    style: "width: 100px",
                    onBlur: () => finishEdit(row),
                    onUpdateValue: (val: string) => {
                        row.alias = val;
                    },
                    onKeyup: (e: KeyboardEvent) => {
                        if (e.key === "Enter") finishEdit(row);
                    },
                });
            } else {
                return h(
                    "span",
                    {
                        style: "cursor:pointer;color:#4fa3ff;font-size:13px;",
                        onClick: () => startEdit(row),
                    },
                    row.alias
                );
            }
        },
    },
    {
        title: "项目路径",
        key: "path",
        render(row: Project) {
            return h("span", { style: "font-size:13px;" }, row.path);
        },
    },
    {
        title: "操作",
        key: "actions",
        render(_row: Project, index: number) {
            return h(
                NButton,
                {
                    size: "small",
                    type: "error",
                    onClick: () => deleteProject(index),
                },
                { default: () => "删除" }
            );
        },
    },
];

onMounted(loadProjects);
watch(projects, saveProjects, { deep: true });
</script>
