import os
import pandas as pd
from langchain.chains import ConversationalRetrievalChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, CSVLoader
from langchain_core.prompts import ChatPromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()


class RAGSystem:
    def __init__(self):
        # Khai báo biến
        self.OPENAI_API_KEY = os.getenv("TOGETHER_API_KEY")
        self.OPENAI_URL = "https://api.together.ai/v1"
        self.OPENAI_MODEL = "meta-llama/Llama-Vision-Free"
        self.CHROMA_PATH = "vectorstore"
        self.DATA_PATH = "data"

        # Khởi tạo components
        self.llm = self._create_llm()
        self.embeddings = self._create_embeddings()
        self.vectorstore = self._load_or_create_vectorstore()
        self.qa_chain = self._create_qa_chain()

    def _create_llm(self, streaming=False):
        return ChatOpenAI(
            model=self.OPENAI_MODEL,
            openai_api_key=self.OPENAI_API_KEY,
            base_url=self.OPENAI_URL,
            streaming=streaming,
        )

    def _create_embeddings(self):
        return HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

    def _get_text_splitter(self):
        return RecursiveCharacterTextSplitter(
            chunk_size=1024,
            chunk_overlap=128,
            length_function=len,
            add_start_index=True,
        )

    def _load_or_create_vectorstore(self):

        if os.path.exists(self.CHROMA_PATH):
            print("Đang tải dữ liệu Chroma hiện có...")
            return Chroma(
                persist_directory=self.CHROMA_PATH,
                embedding_function=self.embeddings
            )

        os.makedirs(self.CHROMA_PATH, exist_ok=True)
        os.makedirs(self.DATA_PATH, exist_ok=True)

        all_docs = []

        # Load PDF
        pdf_loader = DirectoryLoader(self.DATA_PATH, glob="**/*.pdf", loader_cls=PyPDFLoader)
        pdf_docs = pdf_loader.load()
        all_docs.extend(pdf_docs)

        # Load CSV
        csv_files = [f for f in os.listdir(self.DATA_PATH) if f.endswith(".csv")]
        for csv_file in csv_files:
            csv_path = os.path.join(self.DATA_PATH, csv_file)
            csv_loader = CSVLoader(file_path=csv_path, encoding="utf-8")
            csv_docs = csv_loader.load()
            all_docs.extend(csv_docs)

        if all_docs:
            text_splitter = self._get_text_splitter()
            splits = text_splitter.split_documents(all_docs)

            return Chroma.from_documents(
                documents=splits,
                embedding=self.embeddings,
                persist_directory=self.CHROMA_PATH
            )

        print("Không tìm thấy tài liệu nào trong thư mục...")
        return Chroma(
            embedding_function=self.embeddings,
            persist_directory=self.CHROMA_PATH
        )

    def _create_qa_chain(self):
        prompt_template = """
        You are a medical assistant that provides helpful, safe, and concise health information. 
        Use the following context to answer the user's question in a clear and simple way. 
        If the answer is not in the context or you are unsure, say you don't know and suggest consulting a qualified healthcare professional. 
        Keep the answer within 3 sentences.
        If the current question is unrelated to the conversation history, ignore the conversation history and only use the current question and context.
        Do not mention the context in your response.
        Context: {context}
        Conversation History: {chat_history}
        Current Question: {question}
        """

        prompt = ChatPromptTemplate.from_template(prompt_template)

        return ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(
                search_type="similarity", search_kwargs={"k": 5}
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
        return response

    def add_documents(self, file_path):
        if file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith(".csv"):
            loader = CSVLoader(file_path, encoding="utf-8")
        else:
            raise ValueError("Chỉ hỗ trợ file PDF hoặc CSV")

        documents = loader.load()
        text_splitter = self._get_text_splitter()
        splits = text_splitter.split_documents(documents)
        self.vectorstore.add_documents(splits)
