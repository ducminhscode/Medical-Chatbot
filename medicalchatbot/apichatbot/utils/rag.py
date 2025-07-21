import os
from langchain.chains import ConversationalRetrievalChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_core.prompts import ChatPromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI


class RAGSystem:
    def __init__(self):
        # Khai báo biến
        self.OPENAI_API_KEY = 'GbHKnS-9D1JaSDuaaLP9ZWfV6oYzlxHeRHysPNd3_hT6pjga1GgIRCTqNu_lxR18X_lip7ii2a3nz2Nzqj1EBKtaZv0'
        self.OPENAI_URL = "https://conductor.arcee.ai/v1"
        self.OPENAI_MODEL = "auto"
        self.CHROMA_PATH = "vectorstore"
        self.PDF_PATH = "data"

        # Khởi tạo components
        self.llm = self._create_llm()
        self.embeddings = self._create_embeddings()
        self.vectorstore = self._load_or_create_vectorstore()
        self.qa_chain = self._create_qa_chain()

    # Khởi tạo mô hình OpenAI
    def _create_llm(self, streaming=False):
        return ChatOpenAI(
            model=self.OPENAI_MODEL,
            openai_api_key=self.OPENAI_API_KEY,
            base_url=self.OPENAI_URL,
            streaming=streaming,
        )

    # Khởi tạo embeddings
    def _create_embeddings(self):
        return HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

    # Tách văn bản
    def _get_text_splitter(self):
        return RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=128,
            length_function=len,
            add_start_index=True,
        )

    # Tải vectorstore hiện có hoặc tạo mới
    def _load_or_create_vectorstore(self):

        # Load vectorstore hiện tại
        if os.path.exists(self.CHROMA_PATH):
            print("Đang tải dữ liệu Chroma hiện có...")
            return Chroma(
                persist_directory=self.CHROMA_PATH,
                embedding_function=self.embeddings
            )

        # Tạo mới vectorstore
        os.makedirs(self.CHROMA_PATH, exist_ok=True)
        os.makedirs(self.PDF_PATH, exist_ok=True)

        # Tải tài liệu nếu có
        if os.listdir(self.PDF_PATH):
            print("Đang tải tài liệu...")
            loader = DirectoryLoader(self.PDF_PATH, glob="**/*.pdf", loader_cls=PyPDFLoader)
            documents = loader.load()
            text_splitter = self._get_text_splitter()
            splits = text_splitter.split_documents(documents)

            return Chroma.from_documents(
                documents=splits,
                embedding=self.embeddings,
                persist_directory=self.CHROMA_PATH
            )

        print("Không tìm thấy tệp PDF nào trong thư mục...")
        # Trả về vectorstore trống nếu không có tài liệu
        return Chroma(
            embedding_function=self.embeddings,
            persist_directory=self.CHROMA_PATH
        )

    def _create_qa_chain(self):
        prompt_template = """Answer the question using your own knowledge and the provided context.

Context:
{context}

Question: {question}

Previous conversation:
{chat_history}

Answer:"""

        prompt = ChatPromptTemplate.from_template(prompt_template)

        return ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(
                search_type="similarity", search_kwargs={"k": 3}
            ),
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": prompt},
            chain_type="stuff",
            verbose=False,
        )

    def query(self, question, chat_history=[]):
        result = self.qa_chain.invoke({
            "question": question,
            "chat_history": chat_history
        })

        response = result["answer"]

        # Thêm nguồn của tài liệu nếu có
        if result.get("source_documents"):
            sources = set()
            for doc in result["source_documents"]:
                source = doc.metadata.get("source", "Unknown")
                page = doc.metadata.get("page", "unknown")
                sources.add(f"{source}, page {page}")

            if sources:
                response += "\n\nSources:\n" + "\n".join(f"- {src}" for src in sources)

        return response

    def add_documents(self, file_path):
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        text_splitter = self._get_text_splitter()
        splits = text_splitter.split_documents(documents)
        self.vectorstore.add_documents(splits)